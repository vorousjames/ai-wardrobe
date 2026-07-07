import React from 'react';
import { render } from '@testing-library/react-native';
import WardrobeScreen from '../../app/tabs/WardrobeScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
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
              }
            ],
            error: null
          })
        })
      })
    })
  }
}));

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('WardrobeScreen', () => {
  beforeEach(() => { 
    jest.clearAllMocks(); 
  });

  it('renders without crashing', async () => {
    const { toJSON } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
    expect(toJSON()).toBeTruthy();
  });
});