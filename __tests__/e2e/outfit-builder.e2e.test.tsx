import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OutfitBuilderScreen from '../../app/tabs/OutfitBuilderScreen';
import RenderResultScreen from '../../app/outfit/RenderResultScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({
    params: { garment_ids: ['1', '2'], user_id: 'user123' },
  }),
}));

jest.mock('../../lib/supabase', () => {
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  mockEq.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({ select: mockSelect });
  return { supabase: { from: mockFrom } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

jest.mock('../../lib/rendering/RenderService', () => ({
  RenderService: {
    getInstance: () => ({
      generateOutfit: jest.fn().mockResolvedValue({ imageUrl: 'https://example.com/outfit.jpg' }),
    }),
  },
}));

jest.mock('../../lib/rendering/RenderPipeline', () => {
  const mockGetCached = jest.fn();
  const mockSetCached = jest.fn();
  return {
    RenderPipeline: {
      getInstance: () => ({
        getCachedResult: mockGetCached,
        setCachedResult: mockSetCached,
      }),
    },
  };
});

const mockGarments = [
  { id: '1', user_id: 'user123', image_url: 'https://example.com/1.jpg', type: 'top', brand: 'Nike', nickname: 'Red Shirt', color: 'Red', fabric: 'Cotton', created_at: '2026-01-01' },
  { id: '2', user_id: 'user123', image_url: 'https://example.com/2.jpg', type: 'bottom', brand: 'Levi', nickname: 'Jeans', color: 'Blue', fabric: 'Denim', created_at: '2026-01-02' },
  { id: '3', user_id: 'user123', image_url: 'https://example.com/3.jpg', type: 'top', brand: 'Adidas', nickname: 'Blue Shirt', color: 'Blue', fabric: 'Polyester', created_at: '2026-01-03' },
  { id: '4', user_id: 'user123', image_url: 'https://example.com/4.jpg', type: 'shoes', brand: 'Nike', nickname: 'Sneakers', color: 'White', fabric: 'Leather', created_at: '2026-01-04' },
];

describe('Outfit Builder E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OutfitBuilderScreen', () => {
    it('renders title', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<OutfitBuilderScreen />);
      expect(await findByText('Build Your Outfit')).toBeTruthy();
    });

    it('renders garment sections grouped by type', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<OutfitBuilderScreen />);
      expect(await findByText('Tops')).toBeTruthy();
      expect(await findByText('Bottoms')).toBeTruthy();
      expect(await findByText('Shoes')).toBeTruthy();
    });

    it('shows garment names in sections', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<OutfitBuilderScreen />);
      expect(await findByText('Red Shirt')).toBeTruthy();
      expect(await findByText('Blue Shirt')).toBeTruthy();
      expect(await findByText('Jeans')).toBeTruthy();
      expect(await findByText('Sneakers')).toBeTruthy();
    });

    it('shows "Render Outfit" button', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<OutfitBuilderScreen />);
      expect(await findByText('Render Outfit')).toBeTruthy();
    });
  });

  describe('RenderResultScreen', () => {
    it('renders without crashing', async () => {
      const { getByText } = await render(<RenderResultScreen />);
      expect(getByText('Rendering...')).toBeTruthy();
    });

    it('shows progress indicator', async () => {
      const { getByText } = await render(<RenderResultScreen />);
      expect(getByText('Generating your outfit...')).toBeTruthy();
    });

    it('shows Back button', async () => {
      const { getByText } = await render(<RenderResultScreen />);
      expect(getByText('Back')).toBeTruthy();
    });

    it('navigates back when Back is pressed', async () => {
      const { getByText } = await render(<RenderResultScreen />);
      fireEvent.press(getByText('Back'));
    });
  });
});
