import React from 'react';
import { render } from '@testing-library/react-native';
import BodyScanScreen from '../../app/onboarding/BodyScanScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-camera', () => ({
  CameraView: jest.fn().mockImplementation(({ children }) => children),
  useCameraPermissions: () => [{ granted: true }, { request: jest.fn() }],
  CameraType: { front: 'front', back: 'back' },
}));

jest.mock('expo-av', () => ({
  Video: jest.fn().mockImplementation(() => null),
}));

jest.mock('../../lib/supabase', () => {
  const upload = jest.fn().mockResolvedValue({ error: null });
  const storage = { from: jest.fn().mockReturnValue({ upload }) };
  const update = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ update });
  return { supabase: { storage, from } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('BodyScanScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders instructions', async () => {
    const { getByText } = await render(<BodyScanScreen />);
    expect(getByText('Body Scan Setup')).toBeTruthy();
    expect(getByText('Please follow these instructions for an accurate scan:')).toBeTruthy();
    expect(getByText('• Wear form-fitting clothes')).toBeTruthy();
    expect(getByText('• Stand in a well-lit area')).toBeTruthy();
    expect(getByText('• Turn slowly 360° during recording')).toBeTruthy();
    expect(getByText('• Keep your arms slightly away from your body')).toBeTruthy();
  });

  it('shows camera and record button', async () => {
    const { getByText } = await render(<BodyScanScreen />);
    expect(getByText('Flip Camera')).toBeTruthy();
    expect(getByText('RECORD')).toBeTruthy();
  });

  it('shows recording hint', async () => {
    const { getByText } = await render(<BodyScanScreen />);
    expect(getByText('Press record and turn slowly 360°')).toBeTruthy();
  });
});