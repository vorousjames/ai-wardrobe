import React from 'react';
import { render } from '@testing-library/react-native';
import WardrobeScreen from '../../app/tabs/WardrobeScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Inline mock — no variables, all defined inside the factory
jest.mock('../../lib/supabase', () => {
  const order = jest.fn().mockResolvedValue({ data: [], error: null });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { supabase: { from } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('WardrobeScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders without crashing', async () => {
    const { toJSON } = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
    expect(toJSON()).toBeTruthy();
  });
});
