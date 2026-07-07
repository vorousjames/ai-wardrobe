import React from 'react';
import { render } from '@testing-library/react-native';
import WardrobeScreen from '../../app/tabs/WardrobeScreen';
import GarmentUploadScreen from '../../app/wardrobe/GarmentUploadScreen';
import GarmentDetailScreen from '../../app/wardrobe/GarmentDetailScreen';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      id: '1',
    },
  }),
}));

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
        })),
      })),
    })),
  },
}));

// Mock auth context
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('Wardrobe E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WardrobeScreen', () => {
    it('renders without crashing', () => {
      const component = render(<WardrobeScreen />);
      expect(component).toBeTruthy();
    });
  });

  describe('GarmentUploadScreen', () => {
    it('renders without crashing', () => {
      const component = render(<GarmentUploadScreen />);
      expect(component).toBeTruthy();
    });
  });

  describe('GarmentDetailScreen', () => {
    it('renders without crashing', () => {
      const component = render(<GarmentDetailScreen />);
      expect(component).toBeTruthy();
    });
  });
});