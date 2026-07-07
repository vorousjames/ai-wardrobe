#!/usr/bin/env python3
"""
Unit tests for error handling in segment_garment.py
"""

import unittest
import os
from unittest.mock import patch, MagicMock
import sys

# Add the server directory to the path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../server/segmentation'))

from segment_garment import process_garment_segmentation, SEGMENTATION_STATUS

class TestErrorHandling(unittest.TestCase):
    
    @patch('segment_garment.download_image_from_supabase')
    def test_process_segmentation_download_failure(self, mock_download):
        """Test handling of image download failure"""
        # Configure mock to return None (download failure)
        mock_download.return_value = None
        
        # Mock the update status function
        with patch('segment_garment.update_garment_segmentation_status') as mock_update_status:
            result = process_garment_segmentation(
                "http://example.com/image.jpg",
                "test-garment-id",
                mock_mode=True  # Use mock segmentation
            )
            
        # Assertions
        self.assertFalse(result)
        mock_download.assert_called_once_with("http://example.com/image.jpg")
        mock_update_status.assert_called_with("test-garment-id", SEGMENTATION_STATUS["FAILED"])
        
    @patch('segment_garment.download_image_from_supabase')
    @patch('segment_garment.mock_segmentation')
    @patch('segment_garment.upload_to_r2')
    def test_process_segmentation_upload_failure(self, mock_upload, mock_segment, mock_download):
        """Test handling of R2 upload failure"""
        # Configure mocks
        mock_image = MagicMock()
        mock_download.return_value = mock_image
        mock_segment.return_value = mock_image
        mock_upload.return_value = None  # Upload failure
        
        # Mock the update status function
        with patch('segment_garment.update_garment_segmentation_status') as mock_update_status:
            result = process_garment_segmentation(
                "http://example.com/image.jpg",
                "test-garment-id",
                mock_mode=True  # Use mock segmentation
            )
            
        # Assertions
        self.assertFalse(result)
        mock_download.assert_called_once_with("http://example.com/image.jpg")
        mock_segment.assert_called_once_with(mock_image)
        mock_upload.assert_called_once()
        mock_update_status.assert_called_with("test-garment-id", SEGMENTATION_STATUS["FAILED"])
        
    @patch('segment_garment.download_image_from_supabase')
    @patch('segment_garment.mock_segmentation')
    @patch('segment_garment.upload_to_r2')
    def test_process_segmentation_database_update_failure(self, mock_upload, mock_segment, mock_download):
        """Test handling of database update failure"""
        # Configure mocks
        mock_image = MagicMock()
        mock_download.return_value = mock_image
        mock_segment.return_value = mock_image
        mock_upload.return_value = "http://example.com/segmented-image.png"
        
        # Mock the update status function to return False (failure)
        with patch('segment_garment.update_garment_segmentation_status', return_value=False) as mock_update_status:
            result = process_garment_segmentation(
                "http://example.com/image.jpg",
                "test-garment-id",
                mock_mode=True  # Use mock segmentation
            )
            
        # Assertions
        self.assertFalse(result)
        mock_download.assert_called_once_with("http://example.com/image.jpg")
        mock_segment.assert_called_once_with(mock_image)
        mock_upload.assert_called_once()
        mock_update_status.assert_called_with(
            "test-garment-id", 
            SEGMENTATION_STATUS["COMPLETE"], 
            "http://example.com/segmented-image.png"
        )

if __name__ == '__main__':
    unittest.main()