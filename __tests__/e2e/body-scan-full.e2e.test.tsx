import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BodyScanScreen from '../../app/onboarding/BodyScanScreen';
import ScanProgressScreen from '../../app/onboarding/ScanProgressScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../lib/supabase', () => {
  const mockGetSession = jest.fn();
  const mockGetPublicUrl = jest.fn();
  return {
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      })),
      storage: {
        from: () => ({
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    },
  };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

jest.mock('expo-camera', () => ({
  CameraView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

jest.mock('expo-file-system/legacy', () => {
  const mockGetInfo = jest.fn();
  const mockUpload = jest.fn();
  return {
    getInfoAsync: mockGetInfo,
    uploadAsync: mockUpload,
  };
});

describe('Body Scan E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const supabase = require('../../lib/supabase').supabase;
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/scan.mp4' },
    });
    const fs = require('expo-file-system');
    fs.getInfoAsync.mockResolvedValue({ exists: true, size: 1000 });
    fs.uploadAsync.mockResolvedValue({ status: 200, body: '{}' });
  });

  describe('BodyScanScreen', () => {
    it('renders instructions and start button', async () => {
      const { getByText } = await render(<BodyScanScreen />);
      expect(getByText('Body Scan Setup')).toBeTruthy();
      expect(getByText('Start Body Scan')).toBeTruthy();
    });

    it('shows video recording instructions', async () => {
      const { getByText } = await render(<BodyScanScreen />);
      expect(getByText('• Wear form-fitting clothing')).toBeTruthy();
      expect(getByText('• Slowly turn 360° in front of the camera')).toBeTruthy();
      expect(getByText('• Use the flip button to switch cameras')).toBeTruthy();
    });

    it('shows start button on initial render', async () => {
      const { getByText } = await render(<BodyScanScreen />);
      expect(getByText('Start Body Scan')).toBeTruthy();
    });

    it('requests camera permission if not granted', async () => {
      const mockRequestPermission = jest.fn();
      const useCameraPermissions = require('expo-camera').useCameraPermissions;
      useCameraPermissions.mockReturnValueOnce([{ granted: false }, mockRequestPermission]);
      
      const { getByText } = await render(<BodyScanScreen />);
      fireEvent.press(getByText('Start Body Scan'));
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('ScanProgressScreen', () => {
    it('renders without crashing', async () => {
      const mockRoute = { params: {} };
      const { getByText } = await render(<ScanProgressScreen route={mockRoute} />);
      expect(getByText('Scan in Progress')).toBeTruthy();
    });

    it('shows processing status', async () => {
      const mockRoute = { params: {} };
      const { getByText } = await render(<ScanProgressScreen route={mockRoute} />);
      expect(getByText('Your body scan is being processed...')).toBeTruthy();
    });
  });
});
