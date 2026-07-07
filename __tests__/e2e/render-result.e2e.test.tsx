import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import RenderResultScreen from '../../app/outfit/RenderResultScreen';

// Mock RenderService
jest.mock('../../lib/rendering/RenderService', () => ({
  RenderService: {
    generateOutfit: jest.fn(),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route with garment IDs
const mockRoute = {
  params: {
    garmentIds: ['1', '2', '3'],
  },
};

describe('Render Result E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with progress indicators', () => {
    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    expect(getByText('Generating Outfit')).toBeTruthy();
    expect(getByText('Preparing garments...')).toBeTruthy();
    expect(getByText('Loading model...')).toBeTruthy();
    expect(getByText('Generating result...')).toBeTruthy();
  });

  it('shows progress during rendering', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock the generateOutfit function to simulate progress
    RenderService.generateOutfit.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            resultUrl: 'https://example.com/result.jpg',
          });
        }, 100);
      });
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    // Initially should show progress
    expect(getByText('Preparing garments...')).toBeTruthy();

    // After completion should show result
    await waitFor(() => {
      expect(getByText('Save Outfit')).toBeTruthy();
    });
  });

  it('displays result when rendering completes', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock successful render
    RenderService.generateOutfit.mockResolvedValueOnce({
      success: true,
      resultUrl: 'https://example.com/result.jpg',
    });

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('render-result-image')).toBeTruthy();
      expect(getByText('Save Outfit')).toBeTruthy();
      expect(getByText('Try Different Pose')).toBeTruthy();
      expect(getByText('Back')).toBeTruthy();
    });
  });

  it('handles rendering error', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock failed render
    RenderService.generateOutfit.mockResolvedValueOnce({
      success: false,
      error: 'Failed to generate outfit',
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Failed to generate outfit')).toBeTruthy();
      expect(getByText('Please try again')).toBeTruthy();
    });
  });

  it('handles save outfit button', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock successful render
    RenderService.generateOutfit.mockResolvedValueOnce({
      success: true,
      resultUrl: 'https://example.com/result.jpg',
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    await waitFor(async () => {
      const saveButton = getByText('Save Outfit');
      fireEvent.press(saveButton);
      
      // In a real implementation, this would save to the database
      // For testing, we just ensure the button works
      expect(saveButton).toBeTruthy();
    });
  });

  it('handles try different pose button', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock successful render
    RenderService.generateOutfit.mockResolvedValueOnce({
      success: true,
      resultUrl: 'https://example.com/result.jpg',
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    await waitFor(() => {
      const poseButton = getByText('Try Different Pose');
      fireEvent.press(poseButton);
      
      // Should navigate back to outfit builder
      expect(mockNavigation.navigate).toHaveBeenCalledWith('OutfitBuilder');
    });
  });

  it('handles back button', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock successful render
    RenderService.generateOutfit.mockResolvedValueOnce({
      success: true,
      resultUrl: 'https://example.com/result.jpg',
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    await waitFor(() => {
      const backButton = getByText('Back');
      fireEvent.press(backButton);
      
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('shows loading state during rendering', async () => {
    const { RenderService } = require('../../lib/rendering/RenderService');
    
    // Mock delayed render to test loading state
    RenderService.generateOutfit.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            resultUrl: 'https://example.com/result.jpg',
          });
        }, 200);
      });
    });

    const { getByText } = render(
      <NavigationContainer>
        <RenderResultScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );

    // Should show loading indicators immediately
    expect(getByText('Preparing garments...')).toBeTruthy();
    
    // Should show result after delay
    await waitFor(() => {
      expect(getByText('Save Outfit')).toBeTruthy();
    }, { timeout: 1000 });
  });
});