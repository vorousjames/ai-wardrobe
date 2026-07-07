import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'compressed-test-uri' }),
  SaveFormat: { JPEG: 'jpeg' },
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

jest.mock('../../lib/segmentation/SegmentationService', () => ({
  SegmentationService: {
    getInstance: () => ({
      queueSegmentation: jest.fn().mockResolvedValue(undefined),
    }),
  },
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

  it('shows error when trying to upload without image', async () => {
    // Mock Alert.alert instead of global alert
    const mockAlert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation();
    const { getByText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
    
    const saveButton = getByText('Save Garment');
    fireEvent.press(saveButton);
    
    expect(mockAlert).toHaveBeenCalledWith('Error', 'Please select an image first');
  });

  it('compresses images before upload', async () => {
    const mockManipulateAsync = require('expo-image-manipulator').manipulateAsync;
    const { getByText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
    
    const cameraButton = getByText('📸 Camera');
    fireEvent.press(cameraButton);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'test-uri',
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 0.8, format: 'jpeg' }
    );
  });
});