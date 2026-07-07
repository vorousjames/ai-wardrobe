import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WardrobeScreen from '../../app/tabs/WardrobeScreen';
import GarmentUploadScreen from '../../app/wardrobe/GarmentUploadScreen';
import GarmentDetailScreen from '../../app/wardrobe/GarmentDetailScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { id: 'garment-1' } }),
}));

jest.mock('../../lib/supabase', () => {
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockSingle = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockInsert = jest.fn();
  const mockUpload = jest.fn();
  const mockGetPublicUrl = jest.fn();

  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  mockInsert.mockResolvedValue({ data: [{ id: 'new-garment' }], error: null });
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/uploaded.jpg' } });

  return {
    supabase: {
      from: mockFrom,
      storage: {
        from: () => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          remove: jest.fn(),
        }),
      },
    },
  };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

jest.mock('../../lib/segmentation/SegmentationService', () => ({
  SegmentationService: {
    getInstance: () => ({
      queueSegmentation: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

const mockGarments = [
  { id: '1', user_id: 'user123', image_url: 'https://example.com/1.jpg', type: 'top', brand: 'Nike', nickname: 'Red Shirt', color: 'Red', fabric: 'Cotton', created_at: '2026-01-01' },
  { id: '2', user_id: 'user123', image_url: 'https://example.com/2.jpg', type: 'bottom', brand: 'Levi', nickname: 'Jeans', color: 'Blue', fabric: 'Denim', created_at: '2026-01-02' },
];

describe('Wardrobe E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WardrobeScreen', () => {
    it('renders title and add button', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('My Wardrobe')).toBeTruthy();
      expect(await findByText('+')).toBeTruthy();
    });

    it('fetches and displays garments', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('Red Shirt')).toBeTruthy();
      expect(await findByText('Jeans')).toBeTruthy();
    });

    it('shows type badges on garment cards', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('top')).toBeTruthy();
      expect(await findByText('bottom')).toBeTruthy();
    });

    it('navigates to GarmentDetail on garment press', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const navigate = jest.fn();
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate }} />);
      fireEvent.press(await findByText('Red Shirt'));
      expect(navigate).toHaveBeenCalledWith('GarmentDetail', { id: '1' });
    });

    it('navigates to GarmentUpload on + press', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: mockGarments, error: null });
      
      const navigate = jest.fn();
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate }} />);
      fireEvent.press(await findByText('+'));
      expect(navigate).toHaveBeenCalledWith('GarmentUpload');
    });

    it('shows empty state when no garments', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: [], error: null });
      
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('Upload your first garment')).toBeTruthy();
    });

    it('shows error state on fetch failure', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().order.mockResolvedValue({ data: null, error: new Error('Network error') });
      
      const { findByText } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('Failed to load garments')).toBeTruthy();
    });
  });

  describe('GarmentUploadScreen', () => {
    it('renders upload form', async () => {
      const { getByText, getByPlaceholderText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByText('Upload Garment')).toBeTruthy();
      expect(getByText('📸 Camera')).toBeTruthy();
      expect(getByText('🖼️ Gallery')).toBeTruthy();
      expect(getByPlaceholderText('Brand (optional)')).toBeTruthy();
      expect(getByPlaceholderText('Nickname (optional)')).toBeTruthy();
      expect(getByText('Save Garment')).toBeTruthy();
    });

    it('shows type picker with all types', async () => {
      const { getByText } = await render(<GarmentUploadScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByText('top')).toBeTruthy();
      expect(getByText('bottom')).toBeTruthy();
      expect(getByText('dress')).toBeTruthy();
      expect(getByText('outerwear')).toBeTruthy();
      expect(getByText('shoes')).toBeTruthy();
      expect(getByText('accessory')).toBeTruthy();
    });
  });

  describe('GarmentDetailScreen', () => {
    it('renders garment details', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().single.mockResolvedValue({ data: mockGarments[0], error: null });
      
      const { findByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('Red Shirt')).toBeTruthy();
      expect(await findByText('Nike')).toBeTruthy();
      expect(await findByText('top')).toBeTruthy();
      expect(await findByText('Red')).toBeTruthy();
      expect(await findByText('Cotton')).toBeTruthy();
    });

    it('shows Edit and Delete buttons', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().single.mockResolvedValue({ data: mockGarments[0], error: null });
      
      const { findByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
      expect(await findByText('Edit')).toBeTruthy();
      expect(await findByText('Delete')).toBeTruthy();
    });

    it('enters edit mode when Edit is pressed', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().single.mockResolvedValue({ data: mockGarments[0], error: null });
      
      const { findByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.press(await findByText('Edit'));
      expect(await findByText('Cancel')).toBeTruthy();
      expect(await findByText('Save')).toBeTruthy();
    });

    it('shows editable fields in edit mode', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().single.mockResolvedValue({ data: mockGarments[0], error: null });
      
      const { findByText, findByPlaceholderText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.press(await findByText('Edit'));
      expect(await findByPlaceholderText('Brand')).toBeTruthy();
      expect(await findByPlaceholderText('Nickname')).toBeTruthy();
      expect(await findByPlaceholderText('Color')).toBeTruthy();
      expect(await findByPlaceholderText('Fabric')).toBeTruthy();
    });

    it('cancels edit mode when Cancel is pressed', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.from().select().eq().single.mockResolvedValue({ data: mockGarments[0], error: null });
      
      const { findByText, queryByText } = await render(<GarmentDetailScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.press(await findByText('Edit'));
      fireEvent.press(await findByText('Cancel'));
      expect(queryByText('Cancel')).toBeNull();
    });
  });
});
