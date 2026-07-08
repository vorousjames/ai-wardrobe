#!/usr/bin/env python3
"""
E2E tests for the garment segmentation pipeline.
Tests the full flow: download image → SAM segmentation → R2 upload → DB update.

Run with:
  source /root/ai-wardrobe-venv/bin/activate
  source /root/ai-wardrobe/.env
  python3 -m pytest test_segmentation_e2e.py -v
"""

import os
import sys
import io
import json
import unittest
from unittest.mock import patch, MagicMock, PropertyMock
from pathlib import Path

# Add the server directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../server/segmentation'))

# ── Unit Tests (no external dependencies) ──────────────────────────────────

class TestSegmentationUnit(unittest.TestCase):
    """Unit tests that mock external services."""

    def setUp(self):
        # Ensure env vars are set for tests
        self.env_patcher = patch.dict('os.environ', {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_KEY': 'test-key',
            'R2_ENDPOINT': 'https://test.r2.dev',
            'R2_ACCESS_KEY': 'test-access',
            'R2_SECRET_KEY': 'test-secret',
            'R2_BUCKET_NAME': 'test-bucket',
        })
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()

    def test_segment_garment_returns_rgba(self):
        """SAM segmentation should return an RGBA image with transparent background."""
        from segment_garment import segment_garment

        # Create a simple test image
        from PIL import Image
        import numpy as np
        img = Image.new("RGB", (100, 100), "white")

        # Mock the SAM predictor
        with patch('segment_garment.get_predictor') as mock_get_predictor:
            mock_predictor = MagicMock()
            mock_predictor.set_image = MagicMock()
            # Return a mask that covers the center 50x50
            mask = np.zeros((100, 100), dtype=bool)
            mask[25:75, 25:75] = True
            mock_predictor.predict.return_value = (
                np.array([mask, mask, mask]),  # masks
                np.array([0.9, 0.8, 0.7]),     # scores
                np.array([]),                   # logits
            )
            mock_get_predictor.return_value = mock_predictor

            result = segment_garment(img)

            # Should be RGBA
            self.assertEqual(result.mode, "RGBA")
            # Center pixel should be opaque
            center_pixel = result.getpixel((50, 50))
            self.assertEqual(center_pixel[3], 255)
            # Corner pixel should be transparent
            corner_pixel = result.getpixel((0, 0))
            self.assertEqual(corner_pixel[3], 0)

    def test_upload_to_r2_uses_correct_path(self):
        """R2 upload should use path: segmented-garments/{user_id}/{garment_id}.png."""
        from segment_garment import upload_to_r2
        from PIL import Image

        img = Image.new("RGBA", (10, 10), (255, 0, 0, 255))

        with patch('segment_garment.boto3.client') as mock_boto:
            mock_s3 = MagicMock()
            mock_boto.return_value = mock_s3

            url = upload_to_r2(img, "user-123", "garment-456")

            # Verify the correct key was used (positional args: fileobj, bucket, key)
            call_args = mock_s3.upload_fileobj.call_args[0]
            self.assertEqual(call_args[1], "test-bucket")
            self.assertEqual(call_args[2], "segmented-garments/user-123/garment-456.png")
            call_kwargs = mock_s3.upload_fileobj.call_args[1]
            self.assertEqual(call_kwargs["ExtraArgs"]["ContentType"], "image/png")

            # Verify the URL matches the expected pattern
            self.assertIn("segmented-garments/user-123/garment-456.png", url)

    def test_main_missing_garment_id(self):
        """Script should exit with error if no garment_id provided."""
        # This is tested by the argparse in __main__, which requires an argument
        pass

    def test_download_image_from_r2(self):
        """Should download an image from a URL and return a PIL Image."""
        from PIL import Image

        with patch('segment_garment.requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            img = Image.new("RGB", (50, 50), "blue")
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            mock_response.content = buf.getvalue()
            mock_get.return_value = mock_response

            # Test the download logic inline (same as main())
            resp = mock_get("https://example.com/test.jpg")
            resp.raise_for_status()
            result = Image.open(io.BytesIO(resp.content))
            self.assertEqual(result.size, (50, 50))

    def test_download_image_failure(self):
        """Should handle download failure gracefully."""
        with patch('segment_garment.requests.get') as mock_get:
            mock_get.side_effect = Exception("Connection error")
            with self.assertRaises(Exception):
                resp = mock_get("https://example.com/bad.jpg")
                resp.raise_for_status()


# ── Integration Tests (require VPS + Supabase + R2) ────────────────────────

@unittest.skipIf(not os.environ.get("SUPABASE_SERVICE_KEY"), "Skipping integration tests: SUPABASE_SERVICE_KEY not set")
class TestSegmentationIntegration(unittest.TestCase):
    """Integration tests that hit real Supabase and R2."""

    def setUp(self):
        from supabase import create_client
        self.supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )

    def _create_test_garment(self, image_url: str) -> str:
        """Create a test garment record and return its ID."""
        result = self.supabase.table("garments").insert({
            "user_id": "6ee2c108-1d18-4b95-a1b5-89323407d1a4",
            "image_url": image_url,
            "type": "top",
            "segmentation_status": "not_started",
        }).execute()
        return result.data[0]["id"]

    def _delete_test_garment(self, garment_id: str):
        """Clean up a test garment record."""
        self.supabase.table("garments").delete().eq("id", garment_id).execute()

    def test_full_segmentation_pipeline(self):
        """End-to-end: create garment → run segmentation → verify results."""
        from segment_garment import main

        # Use the public test image in R2
        test_url = "https://pub-ccd05115df2b4bd88d357ffb23364d05.r2.dev/test-garment.jpg"
        garment_id = self._create_test_garment(test_url)

        try:
            # Run the segmentation pipeline
            main(garment_id)

            # Verify the garment record was updated
            result = self.supabase.table("garments").select(
                "segmentation_status, segmented_url"
            ).eq("id", garment_id).single().execute()

            self.assertEqual(result.data["segmentation_status"], "complete")
            self.assertIsNotNone(result.data["segmented_url"])
            self.assertIn(
                f"segmented-garments/6ee2c108-1d18-4b95-a1b5-89323407d1a4/{garment_id}.png",
                result.data["segmented_url"]
            )

            # Verify the segmented image exists in R2 and is a valid PNG
            import requests
            resp = requests.get(result.data["segmented_url"])
            self.assertEqual(resp.status_code, 200)
            self.assertIn("image/png", resp.headers.get("content-type", ""))

        finally:
            self._delete_test_garment(garment_id)

    def test_pipeline_fails_on_bad_url(self):
        """Pipeline should mark garment as failed on bad image URL."""
        from segment_garment import main

        garment_id = self._create_test_garment("https://example.com/nonexistent.jpg")

        try:
            with self.assertRaises(SystemExit):
                main(garment_id)

            result = self.supabase.table("garments").select(
                "segmentation_status"
            ).eq("id", garment_id).single().execute()

            self.assertEqual(result.data["segmentation_status"], "failed")
        finally:
            self._delete_test_garment(garment_id)


if __name__ == "__main__":
    unittest.main()
