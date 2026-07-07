#!/usr/bin/env python3
"""
Body scan processing pipeline for ai-wardrobe.
Runs on HeavenScape VPS (68.183.151.153) — shared resource, not dedicated.

Pipeline:
1. Download 360° video from Supabase Storage
2. Extract frames using ffmpeg
3. Run MediaPipe Pose for body landmarks
4. Calculate body measurements from landmarks
5. Update Supabase profile with measurements + status

Usage:
  source /root/ai-wardrobe-venv/bin/activate
  python3 process_scan.py <user_id> <scan_id>

Environment variables (set in /root/ai-wardrobe-venv/.env or passed inline):
  SUPABASE_URL=https://tmcfiscdluwwpkcaeyky.supabase.co
  SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

import os
import sys
import json
import math
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional

import mediapipe as mp
import cv2
import numpy as np
from supabase import create_client, Client

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tmcfiscdluwwpkcaeyky.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BODY_SCANS_BUCKET = "body-scans"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("body-scan")

# ── MediaPipe Setup ────────────────────────────────────────────────────────

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,       # 0=lite, 1=full, 2=heavy
    enable_segmentation=False,
    min_detection_confidence=0.5,
)

# Landmark indices for measurement calculations
LANDMARK_INDICES = {
    "nose": 0,
    "left_eye": 1, "right_eye": 2,
    "left_ear": 3, "right_ear": 4,
    "left_shoulder": 11, "right_shoulder": 12,
    "left_elbow": 13, "right_elbow": 14,
    "left_wrist": 15, "right_wrist": 16,
    "left_hip": 23, "right_hip": 24,
    "left_knee": 25, "right_knee": 26,
    "left_ankle": 27, "right_ankle": 28,
    "left_heel": 29, "right_heel": 30,
    "left_foot_index": 31, "right_foot_index": 32,
}

# ── Helpers ─────────────────────────────────────────────────────────────────

def get_landmark(landmarks, idx):
    """Get (x, y, z, visibility) for a landmark index."""
    lm = landmarks[idx]
    return (lm.x, lm.y, lm.z, lm.visibility)


def distance_3d(a, b):
    """Euclidean distance between two 3D points."""
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] - b[2])**2)


def distance_2d(a, b):
    """Euclidean distance between two 2D points (x, y only)."""
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


def pixel_distance(landmarks, idx_a, idx_b, img_w, img_h):
    """Distance in pixels between two landmarks."""
    a = get_landmark(landmarks, idx_a)
    b = get_landmark(landmarks, idx_b)
    ax_px, ay_px = a[0] * img_w, a[1] * img_h
    bx_px, by_px = b[0] * img_w, b[1] * img_h
    return math.sqrt((ax_px - bx_px)**2 + (ay_px - by_px)**2)


# ── Step 1: Download video ─────────────────────────────────────────────────

def download_video(supabase: Client, user_id: str, scan_id: str, dest: Path) -> Path:
    """Download video from Supabase Storage to local temp file."""
    file_path = f"body-scan/{user_id}/{scan_id}.mp4"
    logger.info(f"Downloading {file_path}...")

    with open(dest, "wb") as f:
        res = supabase.storage.from_(BODY_SCANS_BUCKET).download(file_path)
        f.write(res)

    logger.info(f"Downloaded to {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


# ── Step 2: Extract frames ─────────────────────────────────────────────────

def extract_frames(video_path: Path, output_dir: Path, interval: int = 10) -> list[Path]:
    """Extract frames at regular intervals using ffmpeg."""
    logger.info(f"Extracting frames every {interval} frames...")
    output_dir.mkdir(parents=True, exist_ok=True)

    pattern = str(output_dir / "frame_%05d.jpg")
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"select=not(mod(n\\,{interval}))",
        "-vsync", "vfr",
        "-q:v", "2",
        "-y", pattern,
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    frames = sorted(output_dir.glob("frame_*.jpg"))
    logger.info(f"Extracted {len(frames)} frames")
    return frames


# ── Step 3: Detect pose ────────────────────────────────────────────────────

def detect_pose_in_frames(frames: list[Path]) -> list[dict]:
    """Run MediaPipe Pose on each frame and collect landmarks."""
    logger.info("Running MediaPipe Pose on frames...")
    all_landmarks = []

    for frame_path in frames:
        img = cv2.imread(str(frame_path))
        if img is None:
            continue
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]

        results = pose.process(img_rgb)
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            all_landmarks.append({
                "landmarks": [(lm.x, lm.y, lm.z, lm.visibility) for lm in landmarks],
                "img_w": w,
                "img_h": h,
            })

    logger.info(f"Pose detected in {len(all_landmarks)}/{len(frames)} frames")
    return all_landmarks


# ── Step 4: Calculate measurements ────────────────────────────────────────

def calculate_measurements(all_landmarks: list[dict]) -> dict:
    """
    Calculate body measurements from detected landmarks.
    Uses the best frame (highest visibility) for each measurement.
    Returns measurements in centimeters.
    """
    if not all_landmarks:
        return {"error": "No pose detected in any frame"}

    logger.info("Calculating body measurements...")

    # Find the best frame (highest average visibility)
    best_frame = max(all_landmarks, key=lambda f: np.mean([lm[3] for lm in f["landmarks"] if lm[3] > 0.5]))
    lm = best_frame["landmarks"]
    w, h = best_frame["img_w"], best_frame["img_h"]

    # Reference: pixel-to-cm ratio using shoulder width as reference
    # Average male shoulder width ~46cm, female ~38cm
    # We'll use the detected shoulder width in pixels and assume average
    # Then scale all other measurements proportionally

    left_shoulder = lm[LANDMARK_INDICES["left_shoulder"]]
    right_shoulder = lm[LANDMARK_INDICES["right_shoulder"]]
    left_hip = lm[LANDMARK_INDICES["left_hip"]]
    right_hip = lm[LANDMARK_INDICES["right_hip"]]
    left_knee = lm[LANDMARK_INDICES["left_knee"]]
    right_knee = lm[LANDMARK_INDICES["right_knee"]]
    left_ankle = lm[LANDMARK_INDICES["left_ankle"]]
    right_ankle = lm[LANDMARK_INDICES["right_ankle"]]
    left_ear = lm[LANDMARK_INDICES["left_ear"]]
    right_ear = lm[LANDMARK_INDICES["right_ear"]]
    left_elbow = lm[LANDMARK_INDICES["left_elbow"]]
    right_elbow = lm[LANDMARK_INDICES["right_elbow"]]
    left_wrist = lm[LANDMARK_INDICES["left_wrist"]]
    right_wrist = lm[LANDMARK_INDICES["right_wrist"]]
    left_foot = lm[LANDMARK_INDICES["left_foot_index"]]
    right_foot = lm[LANDMARK_INDICES["right_foot_index"]]
    nose = lm[LANDMARK_INDICES["nose"]]

    # Pixel distances
    shoulder_px = distance_2d(left_shoulder, right_shoulder)
    hip_px = distance_2d(left_hip, right_hip)
    torso_px = distance_2d(
        ((left_shoulder[0] + right_shoulder[0]) / 2, (left_shoulder[1] + right_shoulder[1]) / 2, 0, 0),
        ((left_hip[0] + right_hip[0]) / 2, (left_hip[1] + right_hip[1]) / 2, 0, 0),
    )
    left_leg_px = distance_2d(left_hip, left_knee) + distance_2d(left_knee, left_ankle)
    right_leg_px = distance_2d(right_hip, right_knee) + distance_2d(right_knee, right_ankle)
    left_arm_px = distance_2d(left_shoulder, left_elbow) + distance_2d(left_elbow, left_wrist)
    right_arm_px = distance_2d(right_shoulder, right_elbow) + distance_2d(right_elbow, right_wrist)
    head_px = distance_2d(
        ((left_ear[0] + right_ear[0]) / 2, (left_ear[1] + right_ear[1]) / 2, 0, 0),
        (nose[0], nose[1], 0, 0),
    ) * 2  # Approximate full head height
    height_px = distance_2d(
        (nose[0], 0, 0, 0),  # Top of head (approximate)
        ((left_foot[0] + right_foot[0]) / 2, (left_foot[1] + right_foot[1]) / 2, 0, 0),
    )

    # Estimate reference: assume average shoulder width of 42cm
    # This gives us a pixel-to-cm ratio
    ref_shoulder_cm = 42.0
    px_per_cm = shoulder_px / ref_shoulder_cm if shoulder_px > 0 else 1

    measurements = {
        "height_cm": round(height_px / px_per_cm, 1) if height_px > 0 else None,
        "shoulder_width_cm": round(shoulder_px / px_per_cm, 1),
        "chest_cm": round(shoulder_px / px_per_cm * 1.2, 1),  # Estimate: chest ~1.2x shoulder width
        "waist_cm": round(hip_px / px_per_cm * 0.9, 1),  # Estimate: waist ~0.9x hip width
        "hip_width_cm": round(hip_px / px_per_cm, 1),
        "torso_length_cm": round(torso_px / px_per_cm, 1),
        "inseam_cm": round(min(left_leg_px, right_leg_px) / px_per_cm, 1),
        "arm_length_cm": round(max(left_arm_px, right_arm_px) / px_per_cm, 1),
        "neck_cm": round(head_px / px_per_cm * 0.8, 1),  # Estimate
        "bicep_cm": round(max(
            distance_2d(left_shoulder, left_elbow),
            distance_2d(right_shoulder, right_elbow)
        ) / px_per_cm * 0.35, 1),  # Rough estimate
        "thigh_cm": round(max(
            distance_2d(left_hip, left_knee),
            distance_2d(right_hip, right_knee)
        ) / px_per_cm * 0.3, 1),  # Rough estimate
        "calf_cm": round(max(
            distance_2d(left_knee, left_ankle),
            distance_2d(right_knee, right_ankle)
        ) / px_per_cm * 0.25, 1),  # Rough estimate
        "frames_analyzed": len(all_landmarks),
        "confidence": round(float(np.mean([lm[3] for lm in best_frame["landmarks"] if lm[3] > 0])), 2),
    }

    logger.info(f"Measurements: {json.dumps(measurements, indent=2)}")
    return measurements


# ── Step 5: Update Supabase ────────────────────────────────────────────────

def update_profile(supabase: Client, user_id: str, measurements: dict):
    """Update the user's profile with measurements and set status to complete."""
    logger.info(f"Updating profile for user {user_id}...")

    data = {
        "body_scan_status": "complete",
        "body_measurements": measurements,
        "body_scan_updated_at": "now()",
    }

    result = supabase.table("profiles").update(data).eq("id", user_id).execute()
    logger.info(f"Profile updated: status=complete")
    return result


def mark_failed(supabase: Client, user_id: str, error_msg: str):
    """Mark the scan as failed."""
    logger.error(f"Marking scan as failed: {error_msg}")
    supabase.table("profiles").update({
        "body_scan_status": "failed",
        "body_scan_updated_at": "now()",
    }).eq("id", user_id).execute()


# ── Main Pipeline ──────────────────────────────────────────────────────────

def main(user_id: str, scan_id: str):
    """Run the full body scan processing pipeline."""
    logger.info(f"=== Starting body scan pipeline ===")
    logger.info(f"User: {user_id}, Scan: {scan_id}")

    if not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Mark as processing
    supabase.table("profiles").update({
        "body_scan_status": "processing",
        "body_scan_updated_at": "now()",
    }).eq("id", user_id).execute()
    logger.info("Status set to processing")

    with tempfile.TemporaryDirectory(prefix="body-scan-") as tmpdir:
        tmp = Path(tmpdir)

        try:
            # Step 1: Download video
            video_path = tmp / f"{scan_id}.mp4"
            download_video(supabase, user_id, scan_id, video_path)

            # Step 2: Extract frames
            frames_dir = tmp / "frames"
            frames = extract_frames(video_path, frames_dir, interval=10)

            if not frames:
                raise Exception("No frames extracted from video")

            # Step 3: Detect pose
            landmarks = detect_pose_in_frames(frames)

            if not landmarks:
                raise Exception("No pose detected in any frame")

            # Step 4: Calculate measurements
            measurements = calculate_measurements(landmarks)

            if "error" in measurements:
                raise Exception(measurements["error"])

            # Step 5: Update profile
            update_profile(supabase, user_id, measurements)

            logger.info("=== Body scan pipeline completed successfully ===")

        except Exception as e:
            mark_failed(supabase, user_id, str(e))
            logger.exception("Pipeline failed")
            sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process_scan.py <user_id> <scan_id>")
        print("  user_id - Supabase user UUID")
        print("  scan_id - Scan identifier (filename without .mp4)")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
