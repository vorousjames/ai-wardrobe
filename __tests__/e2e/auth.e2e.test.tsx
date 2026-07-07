import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../app/auth/LoginScreen';
import SignUpScreen from '../../app/auth/SignUpScreen';

jest.mock('../../lib/supabase', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  return {
    supabase: {
      auth: {
        signInWithPassword: mockSignIn,
        signUp: mockSignUp,
      },
    },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('Auth E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    it('renders email and password inputs and login button', async () => {
      const { getByPlaceholderText, getAllByText } = await render(<LoginScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getAllByText('Login').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Don\'t have an account? Sign Up" link', async () => {
      const { getByText } = await render(<LoginScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByText("Don't have an account? Sign Up")).toBeTruthy();
    });

    it('navigates to SignUp when link is pressed', async () => {
      const navigate = jest.fn();
      const { getByText } = await render(<LoginScreen navigation={{ navigate }} />);
      fireEvent.press(getByText("Don't have an account? Sign Up"));
      expect(navigate).toHaveBeenCalledWith('SignUp');
    });

    it('calls signInWithPassword with email and password on login press', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
      
      const { getByPlaceholderText, getAllByText } = await render(<LoginScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getAllByText('Login')[0]);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('shows loading state while logging in', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.auth.signInWithPassword.mockImplementation(() => new Promise(() => {}));
      
      const { getByPlaceholderText, getAllByText, findByText } = await render(<LoginScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getAllByText('Login')[0]);
      expect(await findByText('Logging in...')).toBeTruthy();
    });
  });

  describe('SignUpScreen', () => {
    it('renders email and password inputs and sign up button', async () => {
      const { getByPlaceholderText, getByText } = await render(<SignUpScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
    });

    it('shows "Already have an account? Login" link', async () => {
      const { getByText } = await render(<SignUpScreen navigation={{ navigate: jest.fn() }} />);
      expect(getByText('Already have an account? Login')).toBeTruthy();
    });

    it('navigates to Login when link is pressed', async () => {
      const navigate = jest.fn();
      const { getByText } = await render(<SignUpScreen navigation={{ navigate }} />);
      fireEvent.press(getByText('Already have an account? Login'));
      expect(navigate).toHaveBeenCalledWith('Login');
    });

    it('calls signUp with email and password on sign up press', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.auth.signUp.mockResolvedValue({ error: null });
      
      const { getByPlaceholderText, getByText } = await render(<SignUpScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.changeText(getByPlaceholderText('Email'), 'new@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getByText('Sign Up'));
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('shows loading state while signing up', async () => {
      const supabase = require('../../lib/supabase').supabase;
      supabase.auth.signUp.mockImplementation(() => new Promise(() => {}));
      
      const { getByPlaceholderText, getByText, findByText } = await render(<SignUpScreen navigation={{ navigate: jest.fn() }} />);
      fireEvent.changeText(getByPlaceholderText('Email'), 'new@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getByText('Sign Up'));
      expect(await findByText('Signing up...')).toBeTruthy();
    });
  });
});
