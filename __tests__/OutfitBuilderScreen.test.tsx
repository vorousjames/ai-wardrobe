import React from 'react';
import { render } from '@testing-library/react-native';
import OutfitBuilderScreen from '../app/tabs/OutfitBuilderScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

// Use mockImplementation to avoid temporal dead zone
jest.mock('../lib/supabase', () => {
  const order = jest.fn().mockResolvedValue({
    data: [
      { id: 'g1', user_id: 'user123', image_url: 'https://example.com/1.jpg', nickname: 'Blue Shirt', type: 'top', created_at: '2023-01-01', segmented_url: null, brand: null, color: null, fabric: null },
      { id: 'g2', user_id: 'user123', image_url: 'https://example.com/2.jpg', nickname: 'Black Pants', type: 'bottom', created_at: '2023-01-02', segmented_url: null, brand: null, color: null, fabric: null },
    ],
    error: null,
  });
  const eq = jest.fn().mockImplementation(() => ({ order }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { supabase: { from } };
});

describe('OutfitBuilderScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('renders without crashing', async () => {
    const { toJSON } = await render(<OutfitBuilderScreen />);
    expect(toJSON()).toBeTruthy();
  });

  test('shows garments when loaded successfully', async () => {
    const { findByText } = await render(<OutfitBuilderScreen />);
    expect(await findByText('Blue Shirt')).toBeTruthy();
    expect(await findByText('Black Pants')).toBeTruthy();
  });
});
