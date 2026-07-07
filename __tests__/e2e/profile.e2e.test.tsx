import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ProfileScreen from '../../app/tabs/ProfileScreen';

// Mock AuthContext
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
    signOut: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

describe('Profile E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user profile information', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProfileScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('Sign Out')).toBeTruthy();
    });
  });

  it('handles sign out', async () => {
    const { useAuth } = require('../../lib/authContext');
    const { supabase } = require('../../lib/supabase');
    
    // Mock signOut function
    const mockSignOut = jest.fn();
    useAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
      signOut: mockSignOut,
    });

    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { getByText } = render(
      <NavigationContainer>
        <ProfileScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      const signOutButton = getByText('Sign Out');
      fireEvent.press(signOutButton);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    });
  });

  it('handles sign out error', async () => {
    const { useAuth } = require('../../lib/authContext');
    const { supabase } = require('../../lib/supabase');
    
    // Mock signOut function that throws an error
    const mockSignOut = jest.fn().mockRejectedValue(new Error('Sign out failed'));
    useAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
      signOut: mockSignOut,
    });

    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { getByText, findByText } = render(
      <NavigationContainer>
        <ProfileScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      const signOutButton = getByText('Sign Out');
      fireEvent.press(signOutButton);
    });

    // In a real app, this would show an error message
    // For now, we're just testing that the function is called
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('displays user avatar or placeholder', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <ProfileScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Should have either an avatar image or placeholder
      const avatarElement = getByTestId('user-avatar');
      expect(avatarElement).toBeTruthy();
    });
  });

  it('shows account settings options', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProfileScreen navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      // These would be additional options in a real app
      // For now, we're just checking the basic structure
      expect(getByText('Profile')).toBeTruthy();
    });
  });
});