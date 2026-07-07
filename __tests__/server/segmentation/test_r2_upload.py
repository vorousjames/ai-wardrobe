#!/usr/bin/env python3
"""
Unit tests for R2 upload functionality in segment_garment.py
"""

import unittest
import os
from unittest.mock import patch, MagicMock
from PIL import Image
from io import BytesIO
import sys

# Add the server directory to the path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../server/segmentation'))

from segment_garment import upload_to_r2

class TestR2Upload(unittest.TestCase):
    
    @patch('segment_garment.boto3.client')
    @patch('segment_garment.R2_ENDPOINT_URL', 'https://example.com')
    @patch('segment_garment.R2_BUCKET_NAME', 'test-bucket')
    def test_upload_to_r2_success(self, mock_boto3_client):
        """Test successful upload to R2"""
        # Create a mock image
        mock_image = MagicMock()
        
        # Create a mock S3 client
        mock_s3_client = MagicMock()
        mock_boto3_client.return_value = mock_s3_client
        
        # Mock BytesIO
        with patch('segment_garment.BytesIO') as mock_bytesio:
            mock_buffer = MagicMock()
            mock_bytesio.return_value = mock_buffer
            
            # Mock image.save to do nothing
            mock_image.save = MagicMock()
            
            result = upload_to_r2(mock_image, "test-garment-id")
            
        # Assertions
        self.assertEqual(result, "https://example.com/test-bucket/segmented/test-garment-id.png")
        mock_boto3_client.assert_called_once_with(
            's3',
            endpoint_url='https://example.com',
            aws_access_key_id=None,
            aws_secret_access_key=None
        )
        mock_s3_client.upload_fileobj.assert_called_once()
        
    @patch('segment_garment.boto3.client')
    def test_upload_to_r2_failure(self, mock_boto3_client):
        """Test failed upload to R2"""
        # Create a mock image
        mock_image = MagicMock()
        
        # Configure mock to raise an exception
        mock_boto3_client.side_effect = Exception("R2 connection failed")
        
        result = upload_to_r2(mock_image, "test-garment-id")
        
        # Assertions
        self.assertIsNone(result)

if __name__ == '__main__':
    unittest.main()