import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import OutfitBuilderScreen from '../../app/tabs/OutfitBuilderScreen';

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
            },
            {
              id: '2',
              name: 'Black Pants',
              type: 'bottom',
              image_url: 'https://example.com/pants.jpg',
            },
            {
              id: '3',
              name: 'Red Shoes',
              type: 'shoes',
              image_url: 'https://example.com/shoes.jpg',
            },
          ],
          error: null,
        })),
      })),
    })),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

describe('Outfit Builder E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Outfit Builder')).toBeTruthy();
      expect(getByText('Select garments to create your outfit')).toBeTruthy();
    });
  });

  it('displays garments grouped by type', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Check that garment types are displayed as headers
      expect(getByText('top')).toBeTruthy();
      expect(getByText('bottom')).toBeTruthy();
      expect(getByText('shoes')).toBeTruthy();
    });
  });

  it('allows selecting garments', async () => {
    const { getByText, getAllByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Select first garment
      const shirtItem = getByText('Blue Shirt');
      fireEvent.press(shirtItem);

      // Select second garment
      const pantsItem = getByText('Black Pants');
      fireEvent.press(pantsItem);
    });

    // Check that items are selected (they should have different styling)
    // This would be tested by checking state or styling in a real implementation
  });

  it('disables render button when less than 2 garments selected', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      const renderButton = getByText('Render Outfit');
      // Button should be disabled initially
      expect(renderButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  it('enables render button when 2 or more garments selected', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Select first garment
      const shirtItem = getByText('Blue Shirt');
      fireEvent.press(shirtItem);

      // Select second garment
      const pantsItem = getByText('Black Pants');
      fireEvent.press(pantsItem);

      // Button should now be enabled
      const renderButton = getByText('Render Outfit');
      expect(renderButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  it('allows deselecting garments', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Select first garment
      const shirtItem = getByText('Blue Shirt');
      fireEvent.press(shirtItem);

      // Select second garment
      const pantsItem = getByText('Black Pants');
      fireEvent.press(pantsItem);

      // Deselect first garment
      fireEvent.press(shirtItem);
    });

    // Check that only one garment is selected
    const renderButton = getByText('Render Outfit');
    // With only one garment selected, button should be disabled again
    expect(renderButton.props.accessibilityState.disabled).toBe(true);
  });

  it('navigates to render result screen when render button pressed', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Select first garment
      const shirtItem = getByText('Blue Shirt');
      fireEvent.press(shirtItem);

      // Select second garment
      const pantsItem = getByText('Black Pants');
      fireEvent.press(pantsItem);

      // Press render button
      const renderButton = getByText('Render Outfit');
      fireEvent.press(renderButton);
    });

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('RenderResult', {
        garmentIds: ['1', '2'],
      });
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
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('No garments available')).toBeTruthy();
      expect(getByText('Add garments to your wardrobe to get started')).toBeTruthy();
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
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Failed to load garments')).toBeTruthy();
    });
  });

  it('handles horizontal scroll for garment selection', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <OutfitBuilderScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Check that horizontal scroll views exist for each garment type
      const topScrollView = getByTestId('garment-scroll-top');
      const bottomScrollView = getByTestId('garment-scroll-bottom');
      const shoesScrollView = getByTestId('garment-scroll-shoes');
      
      expect(topScrollView).toBeTruthy();
      expect(bottomScrollView).toBeTruthy();
      expect(shoesScrollView).toBeTruthy();
    });
  });
});