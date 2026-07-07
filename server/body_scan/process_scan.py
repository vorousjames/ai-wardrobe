#!/usr/bin/env python3
"""
Body scan processing pipeline for ai-wardrobe.
Runs on HeavenScape VPS (68.183.151.153) — shared resource, not dedicated.

Reports real progress to Supabase so the app shows accurate status.

Usage:
  /root/ai-wardrobe-venv/bin/python3 process_scan.py <user_id> <scan_id>

Environment:
  SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import os
import sys
import json
import math
import subprocess
import tempfile
import logging
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from supabase import create_client, Client

from mediapipe.tasks import python as mp_tasks
import mediapipe as mp
from mediapipe.tasks.python import vision

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tmcfiscdluwwpkcaeyky.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BODY_SCANS_BUCKET = "body-scans"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("body-scan")

# ── Progress Reporting ─────────────────────────────────────────────────────

def report_progress(supabase: Client, user_id: str, pct: int, message: str):
    """Update the user's profile with current progress."""
    try:
        supabase.table("profiles").update({
            "body_scan_progress": pct,
            "body_scan_message": message,
            "body_scan_updated_at": "now()",
        }).eq("id", user_id).execute()
        logger.info(f"Progress: {pct}% - {message}")
    except Exception as e:
        logger.warning(f"Failed to report progress: {e}")


def mark_status(supabase: Client, user_id: str, status: str, pct: int = 0, msg: str = ""):
    """Update status + progress atomically."""
    data = {
        "body_scan_status": status,
        "body_scan_progress": pct,
        "body_scan_message": msg,
        "body_scan_updated_at": "now()",
    }
    supabase.table("profiles").update(data).eq("id", user_id).execute()
    logger.info(f"Status: {status} ({pct}%) - {msg}")


# ── Step 1: Download video ─────────────────────────────────────────────────

def download_video(supabase: Client, user_id: str, scan_id: str, dest: Path) -> Path:
    """Download video from Supabase Storage to local temp file."""
    file_path = f"body-scan/{user_id}/{scan_id}.mp4"
    report_progress(supabase, user_id, 5, f"Downloading video...")

    with open(dest, "wb") as f:
        res = supabase.storage.from_(BODY_SCANS_BUCKET).download(file_path)
        f.write(res)

    size_mb = dest.stat().st_size / 1e6
    logger.info(f"Downloaded to {dest} ({size_mb:.1f} MB)")
    report_progress(supabase, user_id, 10, f"Video downloaded ({size_mb:.1f} MB)")
    return dest


# ── Step 2: Extract frames ─────────────────────────────────────────────────

def extract_frames(video_path: Path, output_dir: Path, interval: int = 10) -> list[Path]:
    """Extract frames at regular intervals using ffmpeg."""
    output_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(output_dir / "frame_%05d.jpg")

    # Get total frame count first
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-count_packets", "-show_entries", "stream=nb_read_packets",
         "-of", "csv=p=0", str(video_path)],
        capture_output=True, text=True, check=True
    )
    total_frames = int(probe.stdout.strip().replace(",", "")) if probe.stdout.strip() else 300
    expected_frames = max(total_frames // interval, 1)

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"select=not(mod(n\\,{interval}))",
        "-vsync", "vfr",
        "-q:v", "2",
        "-y", pattern,
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    frames = sorted(output_dir.glob("frame_*.jpg"))
    logger.info(f"Extracted {len(frames)} frames from ~{total_frames} total")
    return frames


# ── Step 3: Detect pose ────────────────────────────────────────────────────

def detect_pose_in_frames(frames: list[Path], supabase: Client, user_id: str) -> list[dict]:
    """Run MediaPipe PoseLandmarker on each frame."""
    report_progress(supabase, user_id, 20, "Loading pose detection model...")

    model_path = "/root/ai-wardrobe/pose_landmarker_lite.task"
    if not os.path.exists(model_path):
        # Download the model
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
        urllib.request.urlretrieve(url, model_path)
        logger.info(f"Downloaded pose model to {model_path}")

    options = vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.IMAGE,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    all_landmarks = []
    total = len(frames)
    start_pct = 25
    end_pct = 70

    for i, frame_path in enumerate(frames):
        img = cv2.imread(str(frame_path))
        if img is None:
            continue

        h, w = img.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img)
        result = landmarker.detect(mp_image)

        if result.pose_landmarks:
            for landmarks in result.pose_landmarks:
                pts = [(lm.x, lm.y, lm.z, lm.visibility if hasattr(lm, 'visibility') else 1.0)
                       for lm in landmarks]
                all_landmarks.append({
                    "landmarks": pts,
                    "img_w": w,
                    "img_h": h,
                })

        # Report progress every 10 frames
        if i % 10 == 0 or i == total - 1:
            pct = start_pct + int((end_pct - start_pct) * (i + 1) / total)
            report_progress(supabase, user_id, pct, f"Analyzing pose... ({i+1}/{total} frames)")

    landmarker.close()
    logger.info(f"Pose detected in {len(all_landmarks)}/{total} frames")
    return all_landmarks


# ── Step 4: Calculate measurements ────────────────────────────────────────

def calculate_measurements(all_landmarks: list[dict]) -> dict:
    """Calculate body measurements from detected landmarks."""
    if not all_landmarks:
        return {"error": "No pose detected in any frame"}

    logger.info("Calculating body measurements...")

    # Best frame = highest avg visibility
    best_frame = max(all_landmarks, key=lambda f: np.mean([lm[3] for lm in f["landmarks"] if lm[3] > 0.5]))
    lm = best_frame["landmarks"]
    w, h = best_frame["img_w"], best_frame["img_h"]

    def dist_2d(a, b):
        return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

    # Landmark indices
    LSHOULDER, RSHOULDER = 11, 12
    LHIP, RHIP = 23, 24
    LKNEE, RKNEE = 25, 26
    LANKLE, RANKLE = 27, 28
    LFOOT, RFOOT = 31, 32
    LEAR, REAR = 7, 8
    NOSE = 0
    LELBOW, RELBOW = 13, 14
    LWRIST, RWRIST = 15, 16

    shoulder_px = dist_2d(lm[LSHOULDER], lm[RSHOULDER])
    hip_px = dist_2d(lm[LHIP], lm[RHIP])
    mid_shoulder = ((lm[LSHOULDER][0] + lm[RSHOULDER][0]) / 2, (lm[LSHOULDER][1] + lm[RSHOULDER][1]) / 2)
    mid_hip = ((lm[LHIP][0] + lm[RHIP][0]) / 2, (lm[LHIP][1] + lm[RHIP][1]) / 2)
    torso_px = dist_2d(mid_shoulder, mid_hip)
    left_leg_px = dist_2d(lm[LHIP], lm[LKNEE]) + dist_2d(lm[LKNEE], lm[LANKLE])
    right_leg_px = dist_2d(lm[RHIP], lm[RKNEE]) + dist_2d(lm[RKNEE], lm[RANKLE])
    left_arm_px = dist_2d(lm[LSHOULDER], lm[LELBOW]) + dist_2d(lm[LELBOW], lm[LWRIST])
    right_arm_px = dist_2d(lm[RSHOULDER], lm[RELBOW]) + dist_2d(lm[RELBOW], lm[RWRIST])
    mid_ear = ((lm[LEAR][0] + lm[REAR][0]) / 2, (lm[LEAR][1] + lm[REAR][1]) / 2)
    head_px = dist_2d(mid_ear, (lm[NOSE][0], lm[NOSE][1])) * 2
    height_px = dist_2d(
        (lm[NOSE][0], 0),
        ((lm[LFOOT][0] + lm[RFOOT][0]) / 2, (lm[LFOOT][1] + lm[RFOOT][1]) / 2),
    )

    ref_shoulder_cm = 42.0
    px_per_cm = shoulder_px / ref_shoulder_cm if shoulder_px > 0 else 1

    measurements = {
        "height_cm": round(height_px / px_per_cm, 1) if height_px > 0 else None,
        "shoulder_width_cm": round(shoulder_px / px_per_cm, 1),
        "chest_cm": round(shoulder_px / px_per_cm * 1.2, 1),
        "waist_cm": round(hip_px / px_per_cm * 0.9, 1),
        "hip_width_cm": round(hip_px / px_per_cm, 1),
        "torso_length_cm": round(torso_px / px_per_cm, 1),
        "inseam_cm": round(min(left_leg_px, right_leg_px) / px_per_cm, 1),
        "arm_length_cm": round(max(left_arm_px, right_arm_px) / px_per_cm, 1),
        "neck_cm": round(head_px / px_per_cm * 0.8, 1),
        "bicep_cm": round(max(dist_2d(lm[LSHOULDER], lm[LELBOW]), dist_2d(lm[RSHOULDER], lm[RELBOW])) / px_per_cm * 0.35, 1),
        "thigh_cm": round(max(dist_2d(lm[LHIP], lm[LKNEE]), dist_2d(lm[RHIP], lm[RKNEE])) / px_per_cm * 0.3, 1),
        "calf_cm": round(max(dist_2d(lm[LKNEE], lm[LANKLE]), dist_2d(lm[RKNEE], lm[RANKLE])) / px_per_cm * 0.25, 1),
        "frames_analyzed": len(all_landmarks),
        "confidence": round(float(np.mean([lm[3] for lm in best_frame["landmarks"] if lm[3] > 0])), 2),
    }

    logger.info(f"Measurements: {json.dumps(measurements, indent=2)}")
    return measurements


# ── Main Pipeline ──────────────────────────────────────────────────────────

def main(user_id: str, scan_id: str):
    logger.info(f"=== Starting body scan pipeline ===")
    logger.info(f"User: {user_id}, Scan: {scan_id}")

    if not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Mark as processing
    mark_status(supabase, user_id, "processing", 2, "Starting scan processing...")

    with tempfile.TemporaryDirectory(prefix="body-scan-") as tmpdir:
        tmp = Path(tmpdir)

        try:
            # Step 1: Download video
            video_path = tmp / f"{scan_id}.mp4"
            download_video(supabase, user_id, scan_id, video_path)

            # Step 2: Extract frames
            report_progress(supabase, user_id, 12, "Extracting frames from video...")
            frames_dir = tmp / "frames"
            frames = extract_frames(video_path, frames_dir, interval=10)
            if not frames:
                raise Exception("No frames extracted from video")
            report_progress(supabase, user_id, 18, f"Extracted {len(frames)} frames")

            # Step 3: Detect pose
            landmarks = detect_pose_in_frames(frames, supabase, user_id)
            if not landmarks:
                raise Exception("No pose detected in any frame")

            # Step 4: Calculate measurements
            report_progress(supabase, user_id, 75, "Calculating body measurements...")
            measurements = calculate_measurements(landmarks)
            if "error" in measurements:
                raise Exception(measurements["error"])

            # Step 5: Save results
            report_progress(supabase, user_id, 90, "Saving results...")
            supabase.table("profiles").update({
                "body_scan_status": "complete",
                "body_measurements": measurements,
                "body_scan_progress": 100,
                "body_scan_message": "Scan complete!",
                "body_scan_updated_at": "now()",
            }).eq("id", user_id).execute()

            logger.info("=== Body scan pipeline completed successfully ===")

        except Exception as e:
            mark_status(supabase, user_id, "failed", 0, f"Failed: {str(e)}")
            logger.exception("Pipeline failed")
            sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process_scan.py <user_id> <scan_id>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
