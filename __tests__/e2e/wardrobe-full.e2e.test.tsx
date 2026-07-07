import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import WardrobeScreen from '../../app/tabs/WardrobeScreen';
import GarmentUploadScreen from '../../app/wardrobe/GarmentUploadScreen';
import GarmentDetailScreen from '../../app/wardrobe/GarmentDetailScreen';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [
            {
              id: '1',
              name: 'Blue Shirt',
              type: 'top',
              image_url: 'https://example.com/shirt.jpg',
              created_at: '2023-01-01',
            },
            {
              id: '2',
              name: 'Black Pants',
              type: 'bottom',
              image_url: 'https://example.com/pants.jpg',
              created_at: '2023-01-02',
            },
          ],
          error: null,
        })),
      })),
      insert: jest.fn(() => ({
        data: [{ id: '3', name: 'New Garment', type: 'accessory', image_url: 'https://example.com/new.jpg' }],
        error: null,
      })),
      update: jest.fn(() => ({
        data: [{ id: '1', name: 'Updated Shirt', type: 'top', image_url: 'https://example.com/shirt.jpg' }],
        error: null,
      })),
      delete: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  },
}));

// Mock Expo Camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  CameraView: jest.fn().mockImplementation(() => null),
}));

// Mock Expo Image Picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test-image.jpg' }],
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test-image-library.jpg' }],
  }),
}));

// Mock Expo FileSystem
jest.mock('expo-file-system', () => ({
  uploadAsync: jest.fn().mockResolvedValue({}),
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

describe('Wardrobe E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WardrobeScreen', () => {
    it('renders garment grid correctly', async () => {
      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <WardrobeScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(getByText('Blue Shirt')).toBeTruthy();
        expect(getByText('Black Pants')).toBeTruthy();
      });

      // Check that garments are displayed in grid
      const garmentGrid = getByTestId('garment-grid');
      expect(garmentGrid).toBeTruthy();
    });

    it('navigates to garment upload screen', () => {
      const { getByText } = render(
        <NavigationContainer>
          <WardrobeScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const addButton = getByText('Add Garment');
      fireEvent.press(addButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('GarmentUpload');
    });

    it('navigates to garment detail screen', async () => {
      const { getByText } = render(
        <NavigationContainer>
          <WardrobeScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const garmentItem = getByText('Blue Shirt');
        fireEvent.press(garmentItem);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('GarmentDetail', {
        garmentId: '1',
      });
    });

    it('handles empty wardrobe state', async () => {
      // Mock empty data
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { getByText } = render(
        <NavigationContainer>
          <WardrobeScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Your wardrobe is empty')).toBeTruthy();
        expect(getByText('Add your first garment')).toBeTruthy();
      });
    });

    it('handles error state', async () => {
      // Mock error
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to load garments' },
      });

      const { getByText } = render(
        <NavigationContainer>
          <WardrobeScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Failed to load garments')).toBeTruthy();
      });
    });
  });

  describe('GarmentUploadScreen', () => {
    it('renders correctly', () => {
      const { getByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      expect(getByText('Upload Garment')).toBeTruthy();
      expect(getByText('Take Photo')).toBeTruthy();
      expect(getByText('Choose from Library')).toBeTruthy();
    });

    it('handles camera upload', async () => {
      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://camera-image.jpg' }],
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const cameraButton = getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        expect(launchCameraAsync).toHaveBeenCalled();
      });
    });

    it('handles gallery upload', async () => {
      const { launchImageLibraryAsync } = require('expo-image-picker');
      launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://gallery-image.jpg' }],
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const galleryButton = getByText('Choose from Library');
      fireEvent.press(galleryButton);

      await waitFor(() => {
        expect(launchImageLibraryAsync).toHaveBeenCalled();
      });
    });

    it('handles upload cancellation', async () => {
      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const cameraButton = getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        // Should not navigate or upload when cancelled
        expect(mockNavigation.goBack).not.toHaveBeenCalled();
      });
    });

    it('submits garment form successfully', async () => {
      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://test-image.jpg' }],
      });

      const { uploadAsync } = require('expo-file-system');
      uploadAsync.mockResolvedValueOnce({
        body: JSON.stringify({ url: 'https://example.com/uploaded.jpg' }),
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from().insert.mockResolvedValueOnce({
        data: [{ id: '3', name: 'Test Garment', type: 'top', image_url: 'https://example.com/uploaded.jpg' }],
        error: null,
      });

      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // First select an image
      const cameraButton = getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        // Fill form
        const nameInput = getByPlaceholderText('Garment name');
        const typeInput = getByPlaceholderText('Garment type');
        
        fireEvent.changeText(nameInput, 'Test Garment');
        fireEvent.changeText(typeInput, 'top');
        
        const submitButton = getByText('Upload Garment');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('handles upload error', async () => {
      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://test-image.jpg' }],
      });

      const { uploadAsync } = require('expo-file-system');
      uploadAsync.mockResolvedValueOnce({
        body: JSON.stringify({ error: 'Upload failed' }),
      });

      const { getByText, getByPlaceholderText, findByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // First select an image
      const cameraButton = getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        // Fill form
        const nameInput = getByPlaceholderText('Garment name');
        const typeInput = getByPlaceholderText('Garment type');
        
        fireEvent.changeText(nameInput, 'Test Garment');
        fireEvent.changeText(typeInput, 'top');
        
        const submitButton = getByText('Upload Garment');
        fireEvent.press(submitButton);
      });

      const errorText = await findByText('Failed to upload garment');
      expect(errorText).toBeTruthy();
    });

    it('validates form inputs', async () => {
      const { getByText, findByText } = render(
        <NavigationContainer>
          <GarmentUploadScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const submitButton = getByText('Upload Garment');
      fireEvent.press(submitButton);

      const nameError = await findByText('Name is required');
      const typeError = await findByText('Type is required');
      const imageError = await findByText('Please select an image');
      
      expect(nameError).toBeTruthy();
      expect(typeError).toBeTruthy();
      expect(imageError).toBeTruthy();
    });
  });

  describe('GarmentDetailScreen', () => {
    const mockRoute = {
      params: {
        garmentId: '1',
      },
    };

    it('renders garment details correctly', async () => {
      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <GarmentDetailScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Blue Shirt')).toBeTruthy();
        expect(getByText('top')).toBeTruthy();
        expect(getByTestId('garment-image')).toBeTruthy();
      });
    });

    it('handles edit garment', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: [{
          id: '1',
          name: 'Blue Shirt',
          type: 'top',
          image_url: 'https://example.com/shirt.jpg',
          created_at: '2023-01-01',
        }],
        error: null,
      });

      supabase.from().update.mockResolvedValueOnce({
        data: [{ id: '1', name: 'Updated Shirt', type: 'top', image_url: 'https://example.com/shirt.jpg' }],
        error: null,
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentDetailScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const editButton = getByText('Edit');
        fireEvent.press(editButton);
      });

      // In a real app, this would open an edit form
      // For now, we're just testing that the button exists and navigation works
      expect(mockNavigation.navigate).toHaveBeenCalledWith('GarmentUpload', {
        garmentId: '1',
      });
    });

    it('handles delete garment', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: [{
          id: '1',
          name: 'Blue Shirt',
          type: 'top',
          image_url: 'https://example.com/shirt.jpg',
          created_at: '2023-01-01',
        }],
        error: null,
      });

      supabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentDetailScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      await waitFor(() => {
        const deleteButton = getByText('Delete');
        fireEvent.press(deleteButton);
      });

      // In a real app, there would be a confirmation dialog
      // For now, we're testing that the delete function is called
      await waitFor(() => {
        expect(supabase.from().delete).toHaveBeenCalledWith();
      });
    });

    it('handles garment not found', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentDetailScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Garment not found')).toBeTruthy();
      });
    });

    it('handles error loading garment', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.from().select().eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to load garment' },
      });

      const { getByText } = render(
        <NavigationContainer>
          <GarmentDetailScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Failed to load garment')).toBeTruthy();
      });
    });
  });
});