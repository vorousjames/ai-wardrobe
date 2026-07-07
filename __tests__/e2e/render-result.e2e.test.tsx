import React from 'react';
import { render } from '@testing-library/react-native';
import RenderResultScreen from '../../app/outfit/RenderResultScreen';

// Mock navigation hooks
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      garment_ids: ['1', '2', '3'],
      user_id: 'test-user-id',
    },
  }),
}));

describe('Render Result E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const component = render(<RenderResultScreen />);
    expect(component).toBeTruthy();
  });
});