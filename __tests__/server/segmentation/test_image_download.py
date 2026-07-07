#!/usr/bin/env python3
"""
Unit tests for image download functionality in segment_garment.py
"""

import unittest
import os
from unittest.mock import patch, MagicMock
from PIL import Image
import sys

# Add the server directory to the path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../server/segmentation'))

from segment_garment import download_image_from_supabase

class TestImageDownload(unittest.TestCase):
    
    @patch('segment_garment.urllib.request.urlopen')
    def test_download_image_success(self, mock_urlopen):
        """Test successful image download"""
        # Create a mock response with image data
        mock_response = MagicMock()
        mock_response.read.return_value = b"fake_image_data"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Create a mock PIL Image
        mock_image = MagicMock()
        with patch('segment_garment.Image.open', return_value=mock_image):
            result = download_image_from_supabase("http://example.com/image.jpg")
            
        # Assertions
        self.assertEqual(result, mock_image)
        mock_urlopen.assert_called_once_with("http://example.com/image.jpg")
        
    @patch('segment_garment.urllib.request.urlopen')
    def test_download_image_failure(self, mock_urlopen):
        """Test image download failure"""
        # Configure mock to raise an exception
        mock_urlopen.side_effect = Exception("Network error")
        
        result = download_image_from_supabase("http://example.com/bad_image.jpg")
        
        # Assertions
        self.assertIsNone(result)
        mock_urlopen.assert_called_once_with("http://example.com/bad_image.jpg")

if __name__ == '__main__':
    unittest.main()