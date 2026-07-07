import React from 'react';
import { render } from '@testing-library/react-native';
import LoginScreen from '../app/auth/LoginScreen';
import WardrobeScreen from '../app/tabs/WardrobeScreen';

jest.mock('../lib/authContext', () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../lib/supabase', () => {
  const order = jest.fn().mockResolvedValue({ data: [], error: null });
  const eq = jest.fn().mockImplementation(() => ({ eq, order }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { supabase: { from } };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockNavigation = { navigate: jest.fn() };

describe('Navigation', () => {
  it('renders auth screens without crashing', async () => {
    const component = await render(<LoginScreen navigation={mockNavigation} />);
    expect(component).toBeTruthy();
  });

  it('renders tab screens without crashing', async () => {
    const component = await render(<WardrobeScreen navigation={{ navigate: jest.fn() }} />);
    expect(component).toBeTruthy();
  });
});
