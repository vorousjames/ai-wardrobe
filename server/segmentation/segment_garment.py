#!/usr/bin/env python3
"""
Garment segmentation pipeline using SAM (Segment Anything Model).
Runs on HeavenScape VPS (68.183.151.153) — shared resource.

Pipeline:
1. Fetch garment with segmentation_status = 'not_started' from Supabase
2. Download garment image
3. Run SAM to segment garment from background
4. Upload transparent PNG to R2 at segmented-garments/{user_id}/{garment_id}.png
5. Update garment record with segmented_url and status

Usage:
  /root/ai-wardrobe-venv/bin/python3 segment_garment.py <garment_id>

Environment:
  SUPABASE_URL, SUPABASE_SERVICE_KEY
  R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME
"""

import os
import sys
import json
import io
import logging
import requests
from pathlib import Path

import torch
import numpy as np
from PIL import Image
import boto3
from supabase import create_client

from segment_anything import sam_model_registry, SamPredictor

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tmcfiscdluwwpkcaeyky.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "commandra-prod")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("garment-seg")

MODEL_PATH = "/root/ai-wardrobe/sam_vit_b.pth"

# ── SAM Setup ──────────────────────────────────────────────────────────────

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        logger.info("Loading SAM model...")
        sam = sam_model_registry["vit_b"](checkpoint=MODEL_PATH)
        sam.to("cpu")
        _predictor = SamPredictor(sam)
        logger.info("SAM model loaded")
    return _predictor


# ── Segmentation ───────────────────────────────────────────────────────────

def segment_garment(image: Image.Image) -> Image.Image:
    """Run SAM on the garment image and return a transparent PNG."""
    predictor = get_predictor()

    # Convert PIL to numpy RGB
    img_np = np.array(image.convert("RGB"))

    # SAM expects the image
    predictor.set_image(img_np)

    # Use a center point prompt to tell SAM to segment the main object
    h, w = img_np.shape[:2]
    input_point = np.array([[w // 2, h // 2]])
    input_label = np.array([1])  # foreground

    masks, scores, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True,
    )

    # Pick the best mask (highest score)
    best_idx = int(np.argmax(scores))
    mask = masks[best_idx]

    # Apply mask to create RGBA with transparent background
    rgba = np.concatenate([img_np, np.zeros((h, w, 1), dtype=np.uint8)], axis=2)
    rgba[mask, 3] = 255

    return Image.fromarray(rgba, "RGBA")


# ── Upload to R2 ──────────────────────────────────────────────────────────

def upload_to_r2(image: Image.Image, user_id: str, garment_id: str) -> str:
    """Upload segmented PNG to R2 and return the public URL."""
    key = f"segmented-garments/{user_id}/{garment_id}.png"

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)

    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
    )
    s3.upload_fileobj(buf, R2_BUCKET_NAME, key, ExtraArgs={"ContentType": "image/png"})

    public_url = f"https://pub-ccd05115df2b4bd88d357ffb23364d05.r2.dev/{key}"
    logger.info(f"Uploaded to {public_url}")
    return public_url


# ── Main ───────────────────────────────────────────────────────────────────

def main(garment_id: str):
    logger.info(f"=== Starting garment segmentation ===")
    logger.info(f"Garment ID: {garment_id}")

    if not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Fetch garment record
    result = supabase.table("garments").select("*").eq("id", garment_id).single().execute()
    garment = result.data
    if not garment:
        logger.error(f"Garment {garment_id} not found")
        sys.exit(1)

    user_id = garment["user_id"]
    image_url = garment["image_url"]

    # Mark as processing
    supabase.table("garments").update({"segmentation_status": "processing"}).eq("id", garment_id).execute()
    logger.info("Status set to processing")

    try:
        # Download image
        logger.info(f"Downloading image from {image_url}")
        resp = requests.get(image_url, timeout=30)
        resp.raise_for_status()
        img_data = resp.content
        image = Image.open(io.BytesIO(img_data))
        logger.info(f"Image downloaded: {image.size}")

        # Run SAM segmentation
        segmented = segment_garment(image)

        # Upload to R2
        segmented_url = upload_to_r2(segmented, user_id, garment_id)

        # Update garment record
        supabase.table("garments").update({
            "segmentation_status": "complete",
            "segmented_url": segmented_url,
        }).eq("id", garment_id).execute()

        logger.info("=== Garment segmentation completed ===")

    except Exception as e:
        logger.exception("Segmentation failed")
        supabase.table("garments").update({
            "segmentation_status": "failed",
        }).eq("id", garment_id).execute()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 segment_garment.py <garment_id>")
        sys.exit(1)
    main(sys.argv[1])
