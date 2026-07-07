#!/usr/bin/env python3
"""
Unit tests for segmentation output functionality in segment_garment.py
"""

import unittest
import os
from unittest.mock import patch, MagicMock
from PIL import Image
import numpy as np
import sys

# Add the server directory to the path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../server/segmentation'))

from segment_garment import mock_segmentation

class TestSegmentationOutput(unittest.TestCase):
    
    def test_mock_segmentation_returns_image(self):
        """Test that mock_segmentation returns a PIL Image"""
        # Create a mock input image
        mock_input_image = MagicMock()
        mock_input_image.size = (100, 100)
        
        # Mock numpy array operations
        with patch('segment_garment.np.array', return_value=np.zeros((100, 100, 3))):
            with patch('segment_garment.cv2.cvtColor', return_value=np.zeros((100, 100, 4))):
                with patch('segment_garment.cv2.circle'):
                    with patch('segment_garment.Image.fromarray') as mock_fromarray:
                        mock_output_image = MagicMock()
                        mock_fromarray.return_value = mock_output_image
                        
                        result = mock_segmentation(mock_input_image)
                        
        # Assertions
        self.assertEqual(result, mock_output_image)
        
    def test_mock_segmentation_with_rgba_input(self):
        """Test mock_segmentation with RGBA input image"""
        # Create a mock input image with RGBA data
        mock_input_image = MagicMock()
        mock_input_image.size = (100, 100)
        
        # Mock numpy array operations for RGBA
        with patch('segment_garment.np.array', return_value=np.zeros((100, 100, 4))):
            with patch('segment_garment.cv2.circle'):
                with patch('segment_garment.Image.fromarray') as mock_fromarray:
                    mock_output_image = MagicMock()
                    mock_fromarray.return_value = mock_output_image
                    
                    result = mock_segmentation(mock_input_image)
                    
        # Assertions
        self.assertEqual(result, mock_output_image)

if __name__ == '__main__':
    unittest.main()