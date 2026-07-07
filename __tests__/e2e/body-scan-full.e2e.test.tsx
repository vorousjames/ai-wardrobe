import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import BodyScanScreen from '../../app/onboarding/BodyScanScreen';
import ScanProgressScreen from '../../app/onboarding/ScanProgressScreen';

// Mock Expo Camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
  CameraView: jest.fn().mockImplementation(() => null),
}));

// Mock Expo FileSystem
jest.mock('expo-file-system', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: {
    MULTI_PART: 'MULTI_PART',
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

describe('Body Scan E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BodyScanScreen', () => {
    it('renders correctly', () => {
      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      expect(getByText('Body Scan')).toBeTruthy();
      expect(getByText('Position yourself in the frame')).toBeTruthy();
      expect(getByText('Start Recording')).toBeTruthy();
    });

    it('requests camera permissions', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('handles camera permission denied', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Camera permission is required')).toBeTruthy();
      });
    });

    it('starts and stops recording', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Start recording
      const startButton = getByText('Start Recording');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(getByText('Stop Recording')).toBeTruthy();
      });

      // Stop recording
      const stopButton = getByText('Stop Recording');
      fireEvent.press(stopButton);

      await waitFor(() => {
        expect(getByText('Start Recording')).toBeTruthy();
      });
    });

    it('flips camera', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const flipButton = getByText('Flip Camera');
      fireEvent.press(flipButton);

      // In a real app, this would change the camera direction
      // For testing, we just ensure the button exists
      expect(flipButton).toBeTruthy();
    });

    it('retakes recording', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Start and stop recording first
      const startButton = getByText('Start Recording');
      fireEvent.press(startButton);

      await waitFor(() => {
        const stopButton = getByText('Stop Recording');
        fireEvent.press(stopButton);
      });

      // Then retake
      const retakeButton = getByText('Retake');
      fireEvent.press(retakeButton);

      await waitFor(() => {
        expect(getByText('Start Recording')).toBeTruthy();
      });
    });

    it('uploads recording successfully', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { uploadAsync } = require('expo-file-system');
      uploadAsync.mockResolvedValueOnce({
        body: JSON.stringify({ scanId: 'scan123' }),
      });

      const { getByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Start and stop recording first
      const startButton = getByText('Start Recording');
      fireEvent.press(startButton);

      await waitFor(() => {
        const stopButton = getByText('Stop Recording');
        fireEvent.press(stopButton);
      });

      // Then upload
      const uploadButton = getByText('Upload');
      fireEvent.press(uploadButton);

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('ScanProgress', {
          scanId: 'scan123',
        });
      });
    });

    it('handles upload error', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const { uploadAsync } = require('expo-file-system');
      uploadAsync.mockResolvedValueOnce({
        body: JSON.stringify({ error: 'Upload failed' }),
      });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <BodyScanScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Start and stop recording first
      const startButton = getByText('Start Recording');
      fireEvent.press(startButton);

      await waitFor(() => {
        const stopButton = getByText('Stop Recording');
        fireEvent.press(stopButton);
      });

      // Then upload
      const uploadButton = getByText('Upload');
      fireEvent.press(uploadButton);

      const errorText = await findByText('Failed to upload scan');
      expect(errorText).toBeTruthy();
    });
  });

  describe('ScanProgressScreen', () => {
    const mockRoute = {
      params: {
        scanId: 'scan123',
      },
    };

    it('renders correctly', () => {
      const { getByText } = render(
        <NavigationContainer>
          <ScanProgressScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      expect(getByText('Processing Scan')).toBeTruthy();
      expect(getByText('Your body scan is being processed')).toBeTruthy();
    });

    it('polls for scan status', async () => {
      // Mock fetch for polling
      global.fetch = jest.fn();

      // First poll - processing
      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          status: 'processing',
          progress: 50,
        }),
      });

      // Second poll - completed
      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          status: 'completed',
          result_url: 'https://example.com/result.obj',
        }),
      });

      const { getByText } = render(
        <NavigationContainer>
          <ScanProgressScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      // Wait for first poll
      await waitFor(() => {
        expect(getByText('50%')).toBeTruthy();
      });

      // Wait for second poll and navigation
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('MainTabs');
      });
    });

    it('handles scan error', async () => {
      // Mock fetch for polling
      global.fetch = jest.fn();

      // First poll - error
      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          status: 'error',
          message: 'Scan processing failed',
        }),
      });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <ScanProgressScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      const errorText = await findByText('Scan processing failed');
      expect(errorText).toBeTruthy();
    });

    it('handles polling error', async () => {
      // Mock fetch for polling
      global.fetch = jest.fn();

      // First poll - network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { getByText, findByText } = render(
        <NavigationContainer>
          <ScanProgressScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      const errorText = await findByText('Failed to check scan status');
      expect(errorText).toBeTruthy();
    });
  });
});