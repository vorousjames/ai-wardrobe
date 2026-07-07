import React from 'react';
import { render } from '@testing-library/react-native';
import OutfitBuilderScreen from '../../app/tabs/OutfitBuilderScreen';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));

// Mock auth context
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

// Mock Supabase
jest.mock('../../lib/supabase', () => {
  const order = jest.fn().mockResolvedValue({
    data: [],
    error: null,
  });
  const eq = jest.fn().mockImplementation(() => ({ order }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { supabase: { from } };
});

describe('Outfit Builder E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const component = await render(<OutfitBuilderScreen />);
    expect(component).toBeTruthy();
  });
});