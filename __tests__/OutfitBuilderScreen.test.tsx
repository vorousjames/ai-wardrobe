import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OutfitBuilderScreen from '../app/tabs/OutfitBuilderScreen';

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {}
  }),
}));

// Mock auth context
jest.mock('../lib/authContext', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'user123'
      }
    },
    loading: false
  }),
}));

// Mock supabase success
const mockSupabaseSuccess = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          data: [
            {
              id: 'garment1',
              user_id: 'user123',
              image_url: 'https://example.com/garment1.jpg',
              nickname: 'Blue Shirt',
              type: 'top',
              created_at: '2023-01-01',
              segmented_url: null,
              brand: null,
              color: null,
              fabric: null
            },
            {
              id: 'garment2',
              user_id: 'user123',
              image_url: 'https://example.com/garment2.jpg',
              nickname: 'Black Pants',
              type: 'bottom',
              created_at: '2023-01-02',
              segmented_url: null,
              brand: null,
              color: null,
              fabric: null
            }
          ],
          error: null
        })
      })
    })
  })
};

// Mock supabase error
const mockSupabaseError = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          data: null,
          error: new Error('Network error')
        })
      })
    })
  })
};

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabaseSuccess
}));

describe('OutfitBuilderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    const { toJSON } = await render(<OutfitBuilderScreen />);
    expect(toJSON()).toBeTruthy();
  });

  test('shows garments when loaded successfully', async () => {
    const { getByText } = await render(<OutfitBuilderScreen />);
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText('Blue Shirt')).toBeTruthy();
    expect(getByText('Black Pants')).toBeTruthy();
  });

  test('shows error state when fetch fails', async () => {
    const mockAlert = jest.spyOn(globalThis as any, 'alert').mockImplementation();
    const { getByText } = await render(<OutfitBuilderScreen />);
    
    // Wait for component to load and error to occur
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if error alert was shown
    expect(mockAlert).toHaveBeenCalledWith('Error', 'Network error');
  });

  test('allows retrying after error', async () => {
    // First mock error, then success
    require('../lib/supabase').supabase = mockSupabaseError;
    
    const { getByText } = await render(<OutfitBuilderScreen />);
    
    // Wait for error state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reset mock to success
    require('../lib/supabase').supabase = mockSupabaseSuccess;
    
    // Find and press retry button
    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);
    
    // Wait for retry to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if garments are now displayed
    expect(getByText('Blue Shirt')).toBeTruthy();
    expect(getByText('Black Pants')).toBeTruthy();
  });

  test('shows empty state when no garments', async () => {
    // Mock supabase to return empty data
    require('../lib/supabase').supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              data: [],
              error: null
            })
          })
        })
      })
    };
    
    const { getByText } = await render(<OutfitBuilderScreen />);
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if empty state is shown
    expect(getByText('No garments in your wardrobe yet')).toBeTruthy();
    expect(getByText('Add Garments')).toBeTruthy();
  });
});