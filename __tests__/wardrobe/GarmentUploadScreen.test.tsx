import React from 'react';
import { render } from '@testing-library/react-native';
import GarmentUploadScreen from '../../app/wardrobe/GarmentUploadScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'test-uri' }] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'test-uri' }] }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../lib/supabase', () => {
  const upload = jest.fn().mockResolvedValue({ error: null });
  const getPublicUrl = jest.fn().mockReturnValue({ publicUrl: 'test-url' });
  const remove = jest.fn().mockResolvedValue({ error: null });
  const storage = { from: jest.fn().mockReturnValue({ upload, getPublicUrl, remove }) };
  const insert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ insert });
  return { supabase: { storage, from } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('GarmentUploadScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders camera and gallery buttons', async () => {
    const { getByText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText('📸 Camera')).toBeTruthy();
    expect(getByText('🖼️ Gallery')).toBeTruthy();
  });

  it('shows metadata form', async () => {
    const { getByText, getByPlaceholderText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByPlaceholderText('Brand (optional)')).toBeTruthy();
    expect(getByPlaceholderText('Nickname (optional)')).toBeTruthy();
    expect(getByText('Type:')).toBeTruthy();
    expect(getByPlaceholderText('Color (optional)')).toBeTruthy();
    expect(getByPlaceholderText('Fabric (optional)')).toBeTruthy();
    expect(getByText('Save Garment')).toBeTruthy();
  });

  it('allows selecting garment type', async () => {
    const { getByText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText('top')).toBeTruthy();
    expect(getByText('bottom')).toBeTruthy();
  });
});
