import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RenderResultScreen from '../app/outfit/RenderResultScreen';

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      garment_ids: ['garment1', 'garment2'],
      user_id: 'user123'
    }
  }),
}));

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        error: null
      })
    })
  }
}));

// Mock RenderPipeline
const mockRenderPipeline = {
  renderOutfit: jest.fn()
};

jest.mock('../lib/rendering/RenderPipeline', () => {
  return {
    RenderPipeline: jest.fn().mockImplementation(() => mockRenderPipeline)
  };
});

describe('RenderResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', async () => {
    // Mock successful render
    mockRenderPipeline.renderOutfit.mockImplementation((request, onProgress) => {
      // Simulate progress updates
      setTimeout(() => onProgress?.({ status: 'pending', message: 'Preparing...' }), 10);
      setTimeout(() => onProgress?.({ status: 'processing', message: 'Processing...', progress: 50 }), 50);
      setTimeout(() => onProgress?.({ status: 'complete', message: 'Complete' }), 100);
      
      return Promise.resolve({
        image_url: 'test-image-url',
        cache_key: 'test-cache-key',
        timestamp: Date.now()
      });
    });

    const { getByText } = await render(<RenderResultScreen />);
    
    // Should show loading state initially
    expect(getByText('Rendering Outfit')).toBeTruthy();
    expect(getByText('Preparing your outfit...')).toBeTruthy();
  });

  test('shows result when render succeeds', async () => {
    // Mock successful render
    mockRenderPipeline.renderOutfit.mockResolvedValue({
      image_url: 'test-image-url',
      cache_key: 'test-cache-key',
      timestamp: Date.now()
    });

    const { findByText } = await render(<RenderResultScreen />);
    
    // Wait for result to appear
    const title = await findByText('Your Outfit');
    expect(title).toBeTruthy();
  });

  test('shows error when render fails', async () => {
    // Mock failed render
    mockRenderPipeline.renderOutfit.mockRejectedValue(new Error('Render failed'));

    const { findByText } = await render(<RenderResultScreen />);
    
    // Wait for error to appear
    const errorTitle = await findByText('Render Failed');
    const errorMessage = await findByText('Render failed');
    expect(errorTitle).toBeTruthy();
    expect(errorMessage).toBeTruthy();
  });

  test('allows retrying after error', async () => {
    // First mock failure, then success
    mockRenderPipeline.renderOutfit
      .mockRejectedValueOnce(new Error('Render failed'))
      .mockResolvedValueOnce({
        image_url: 'test-image-url',
        cache_key: 'test-cache-key',
        timestamp: Date.now()
      });

    const { findByText } = await render(<RenderResultScreen />);
    
    // Wait for error to appear
    await findByText('Render Failed');
    
    // Find and press retry button
    const retryButton = await findByText('Try Again');
    fireEvent.press(retryButton);
    
    // Wait for success
    const title = await findByText('Your Outfit');
    expect(title).toBeTruthy();
  });

  test('allows saving outfit', async () => {
    // Mock successful render
    mockRenderPipeline.renderOutfit.mockResolvedValue({
      image_url: 'test-image-url',
      cache_key: 'test-cache-key',
      timestamp: Date.now()
    });

    const mockAlert = jest.spyOn(globalThis as any, 'alert').mockImplementation();
    const { findByText } = await render(<RenderResultScreen />);
    
    // Wait for result to appear
    await findByText('Your Outfit');
    
    // Find and press save button
    const saveButton = await findByText('Save');
    fireEvent.press(saveButton);
    
    // Check if success alert was shown
    expect(mockAlert).toHaveBeenCalledWith('Success', 'Outfit saved to your wardrobe!');
  });
});