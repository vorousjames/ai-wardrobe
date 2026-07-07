import React from 'react';
import { render } from '@testing-library/react-native';
import LoginScreen from '../../app/auth/LoginScreen';
import SignUpScreen from '../../app/auth/SignUpScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

describe('Auth E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    it('renders without crashing', () => {
      const component = render(<LoginScreen navigation={mockNavigation} />);
      expect(component).toBeTruthy();
    });
  });

  describe('SignUpScreen', () => {
    it('renders without crashing', () => {
      const component = render(<SignUpScreen navigation={mockNavigation} />);
      expect(component).toBeTruthy();
    });
  });
});