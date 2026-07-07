import React from 'react';
import { render } from '@testing-library/react-native';
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

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
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
  }
}));

describe('OutfitBuilderScreen', () => {
  test('renders without crashing', () => {
    render(<OutfitBuilderScreen />);
    // If no error is thrown, the test passes
    expect(true).toBe(true);
  });

  // Additional tests would require more complex mocking and async handling
  // which is beyond the scope of this implementation
});