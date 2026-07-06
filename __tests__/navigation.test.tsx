import React from 'react';
import { render } from '@testing-library/react-native';
import LoginScreen from '../app/auth/LoginScreen';
import WardrobeScreen from '../app/tabs/WardrobeScreen';

// Mock auth context for testing
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

describe('Navigation', () => {
  it('renders auth screens without crashing', () => {
    const component = render(<LoginScreen />);
    expect(component).toBeTruthy();
  });

  it('renders tab screens without crashing', () => {
    const component = render(<WardrobeScreen />);
    expect(component).toBeTruthy();
  });
});