import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileScreen from '../../app/tabs/ProfileScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

// Mock auth context
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
    signOut: jest.fn(),
  }),
}));

describe('Profile E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const component = render(<ProfileScreen navigation={mockNavigation} />);
    expect(component).toBeTruthy();
  });
});