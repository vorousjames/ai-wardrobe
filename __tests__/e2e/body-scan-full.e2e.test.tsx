import React from 'react';
import { render } from '@testing-library/react-native';
import BodyScanScreen from '../../app/onboarding/BodyScanScreen';
import ScanProgressScreen from '../../app/onboarding/ScanProgressScreen';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock auth context
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user123' } }, loading: false }),
}));

describe('Body Scan E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BodyScanScreen', () => {
    it('renders without crashing', () => {
      const component = render(<BodyScanScreen />);
      expect(component).toBeTruthy();
    });
  });

  describe('ScanProgressScreen', () => {
    it('renders without crashing', () => {
      const mockRoute = {
        params: {
          scanId: 'scan123',
        },
      };
      
      const component = render(<ScanProgressScreen route={mockRoute} />);
      expect(component).toBeTruthy();
    });
  });
});