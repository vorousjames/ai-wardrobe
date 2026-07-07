import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../../app/auth/LoginScreen';
import SignUpScreen from '../../app/auth/SignUpScreen';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

describe('Auth E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          <LoginScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText('Don\'t have an account? Sign Up')).toBeTruthy();
    });

    it('handles successful login', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <LoginScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      });
    });

    it('handles login error', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      const { getByPlaceholderText, getByText, findByText } = render(
        <NavigationContainer>
          <LoginScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      const errorText = await findByText('Invalid credentials');
      expect(errorText).toBeTruthy();
    });

    it('navigates to signup screen', () => {
      const { getByText } = render(
        <NavigationContainer>
          <LoginScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const signUpButton = getByText('Don\'t have an account? Sign Up');
      fireEvent.press(signUpButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('SignUp');
    });

    it('validates form inputs', async () => {
      const { getByText, findByText } = render(
        <NavigationContainer>
          <LoginScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const signInButton = getByText('Sign In');
      fireEvent.press(signInButton);

      const emailError = await findByText('Email is required');
      const passwordError = await findByText('Password is required');
      
      expect(emailError).toBeTruthy();
      expect(passwordError).toBeTruthy();
    });
  });

  describe('SignUpScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      expect(getByText('Create Account')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Already have an account? Sign In')).toBeTruthy();
    });

    it('handles successful signup', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const confirmPasswordInput = getByPlaceholderText('Confirm Password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      });
    });

    it('handles signup error', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      const { getByPlaceholderText, getByText, findByText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const confirmPasswordInput = getByPlaceholderText('Confirm Password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      const errorText = await findByText('Email already exists');
      expect(errorText).toBeTruthy();
    });

    it('navigates to login screen', () => {
      const { getByText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const signInButton = getByText('Already have an account? Sign In');
      fireEvent.press(signInButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('validates password confirmation', async () => {
      const { getByPlaceholderText, getByText, findByText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const confirmPasswordInput = getByPlaceholderText('Confirm Password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'differentpassword');
      fireEvent.press(signUpButton);

      const errorText = await findByText('Passwords do not match');
      expect(errorText).toBeTruthy();
    });

    it('validates form inputs', async () => {
      const { getByText, findByText } = render(
        <NavigationContainer>
          <SignUpScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);

      const emailError = await findByText('Email is required');
      const passwordError = await findByText('Password is required');
      const confirmPasswordError = await findByText('Please confirm your password');
      
      expect(emailError).toBeTruthy();
      expect(passwordError).toBeTruthy();
      expect(confirmPasswordError).toBeTruthy();
    });
  });
});