import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GarmentDetailScreen from '../../app/wardrobe/GarmentDetailScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { id: 'test-garment-id' } }),
}));

jest.mock('../../lib/supabase', () => {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 'test-garment-id', user_id: 'test-user-id', image_url: 'test-image-url',
      nickname: 'Blue Shirt', brand: 'Nike', type: 'top', color: 'Blue', fabric: 'Cotton',
    },
    error: null,
  });
  const update = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn().mockResolvedValue({ error: null });
  const eq = jest.fn().mockImplementation(() => ({ eq, single, update, delete: del }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select, update, delete: del, eq });
  return { supabase: { from } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('GarmentDetailScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders garment nickname and brand', async () => {
    const { findByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
    expect(await findByText('Blue Shirt')).toBeTruthy();
    expect(await findByText('Nike')).toBeTruthy();
  });

  it('shows delete button', async () => {
    const { findByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
    expect(await findByText('Delete')).toBeTruthy();
  });

  it('enters edit mode when Edit is pressed', async () => {
    const { findByText, findByPlaceholderText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
    const editButton = await findByText('Edit');
    fireEvent.press(editButton);
    expect(await findByPlaceholderText('Brand')).toBeTruthy();
    expect(await findByPlaceholderText('Nickname')).toBeTruthy();
    expect(await findByPlaceholderText('Color')).toBeTruthy();
    expect(await findByPlaceholderText('Fabric')).toBeTruthy();
  });
});
