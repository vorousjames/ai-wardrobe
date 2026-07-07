#!/usr/bin/env python3
"""
Garment segmentation script using Segment Anything Model (SAM).
Downloads garment image from Supabase Storage, segments the garment from background,
and uploads the segmented image to Cloudflare R2.
"""

import os
import sys
import argparse
import logging
from typing import Optional, Tuple
import urllib.request
from io import BytesIO

import torch
import cv2
import numpy as np
from PIL import Image
import boto3
from supabase import create_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")

# Segmentation status constants
SEGMENTATION_STATUS = {
    "NOT_STARTED": "not_started",
    "PROCESSING": "processing",
    "COMPLETE": "complete",
    "FAILED": "failed"
}

def download_image_from_supabase(image_url: str) -> Optional[Image.Image]:
    """
    Download image from Supabase Storage.
    
    Args:
        image_url (str): URL of the image to download
        
    Returns:
        Image.Image or None: Downloaded image or None if failed
    """
    try:
        logger.info(f"Downloading image from: {image_url}")
        with urllib.request.urlopen(image_url) as response:
            image_data = response.read()
        image = Image.open(BytesIO(image_data))
        logger.info("Image downloaded successfully")
        return image
    except Exception as e:
        logger.error(f"Failed to download image: {e}")
        return None

def mock_segmentation(image: Image.Image) -> Image.Image:
    """
    Mock segmentation for testing purposes.
    Creates a simple circular mask in the center of the image.
    
    Args:
        image (Image.Image): Input image
        
    Returns:
        Image.Image: Segmented image with transparent background
    """
    logger.info("Running mock segmentation")
    # Convert to numpy array
    img_array = np.array(image)
    
    # Create a circular mask in the center
    h, w = img_array.shape[:2]
    center = (w // 2, h // 2)
    radius = min(h, w) // 3
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, center, radius, 255, -1)
    
    # Apply mask to image
    if img_array.shape[2] == 3:  # RGB
        rgba_image = cv2.cvtColor(img_array, cv2.COLOR_RGB2RGBA)
    else:  # Already RGBA
        rgba_image = img_array.copy()
    
    # Make background transparent
    rgba_image[mask == 0, 3] = 0
    
    # Convert back to PIL Image
    segmented_image = Image.fromarray(rgba_image, 'RGBA')
    return segmented_image

def segment_garment_with_sam(image: Image.Image) -> Image.Image:
    """
    Segment garment using Segment Anything Model (SAM).
    For MVP, we're using mock segmentation.
    
    Args:
        image (Image.Image): Input image
        
    Returns:
        Image.Image: Segmented image with transparent background
    """
    # In a full implementation, we would:
    # 1. Load the SAM model
    # 2. Preprocess the image
    # 3. Run SAM inference
    # 4. Post-process the mask
    # 5. Apply mask to create transparent background
    
    # For MVP, use mock segmentation
    return mock_segmentation(image)

def upload_to_r2(image: Image.Image, garment_id: str) -> Optional[str]:
    """
    Upload segmented image to Cloudflare R2.
    
    Args:
        image (Image.Image): Segmented image to upload
        garment_id (str): ID of the garment
        
    Returns:
        str or None: URL of uploaded image or None if failed
    """
    try:
        logger.info("Uploading segmented image to R2")
        
        # Create R2 client
        s3_client = boto3.client(
            's3',
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY
        )
        
        # Convert image to bytes
        img_buffer = BytesIO()
        image.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Upload to R2
        key = f"segmented/{garment_id}.png"
        s3_client.upload_fileobj(img_buffer, R2_BUCKET_NAME, key)
        
        # Return the URL of the uploaded image
        r2_url = f"{R2_ENDPOINT_URL}/{R2_BUCKET_NAME}/{key}"
        logger.info(f"Image uploaded successfully to: {r2_url}")
        return r2_url
    except Exception as e:
        logger.error(f"Failed to upload image to R2: {e}")
        return None

def update_garment_segmentation_status(garment_id: str, status: str, segmented_url: Optional[str] = None) -> bool:
    """
    Update garment segmentation status in the database.
    
    Args:
        garment_id (str): ID of the garment
        status (str): Segmentation status
        segmented_url (str, optional): URL of segmented image
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        logger.info(f"Updating garment {garment_id} segmentation status to: {status}")
        
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Update garment record
        update_data = {"segmentation_status": status}
        if segmented_url:
            update_data["segmented_url"] = segmented_url
            
        response = supabase.table("garments").update(update_data).eq("id", garment_id).execute()
        
        if response.data:
            logger.info("Garment segmentation status updated successfully")
            return True
        else:
            logger.error("Failed to update garment segmentation status")
            return False
    except Exception as e:
        logger.error(f"Error updating garment segmentation status: {e}")
        return False

def process_garment_segmentation(garment_image_url: str, garment_id: str, mock_mode: bool = False) -> bool:
    """
    Process garment segmentation pipeline.
    
    Args:
        garment_image_url (str): URL of the garment image
        garment_id (str): ID of the garment
        mock_mode (bool): Whether to use mock segmentation (for testing)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Update status to processing
        update_garment_segmentation_status(garment_id, SEGMENTATION_STATUS["PROCESSING"])
        
        # Download image from Supabase Storage
        image = download_image_from_supabase(garment_image_url)
        if image is None:
            update_garment_segmentation_status(garment_id, SEGMENTATION_STATUS["FAILED"])
            return False
        
        # Run segmentation (mock for MVP)
        segmented_image = segment_garment_with_sam(image) if not mock_mode else mock_segmentation(image)
        
        # Upload segmented image to R2
        segmented_url = upload_to_r2(segmented_image, garment_id)
        if segmented_url is None:
            update_garment_segmentation_status(garment_id, SEGMENTATION_STATUS["FAILED"])
            return False
        
        # Update database with segmented URL and status
        success = update_garment_segmentation_status(
            garment_id, 
            SEGMENTATION_STATUS["COMPLETE"], 
            segmented_url
        )
        
        return success
    except Exception as e:
        logger.error(f"Error processing garment segmentation: {e}")
        update_garment_segmentation_status(garment_id, SEGMENTATION_STATUS["FAILED"])
        return False

def main():
    """Main entry point for the segmentation script."""
    parser = argparse.ArgumentParser(description="Segment garment from background")
    parser.add_argument("--image-url", required=True, help="URL of the garment image")
    parser.add_argument("--garment-id", required=True, help="ID of the garment")
    parser.add_argument("--mock", action="store_true", help="Use mock segmentation for testing")
    
    args = parser.parse_args()
    
    # Validate environment variables
    required_env_vars = [
        "SUPABASE_URL", "SUPABASE_KEY", 
        "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", 
        "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT_URL"
    ]
    
    missing_env_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_env_vars:
        logger.error(f"Missing environment variables: {missing_env_vars}")
        sys.exit(1)
    
    # Process garment segmentation
    success = process_garment_segmentation(
        args.image_url, 
        args.garment_id, 
        args.mock
    )
    
    if success:
        logger.info("Garment segmentation completed successfully")
        sys.exit(0)
    else:
        logger.error("Garment segmentation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()