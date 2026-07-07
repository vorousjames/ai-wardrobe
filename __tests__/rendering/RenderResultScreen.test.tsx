import React from 'react';
import { render } from '@testing-library/react-native';
import RenderResultScreen from '../../app/outfit/RenderResultScreen';

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      garment_ids: ['garment1', 'garment2'],
      user_id: 'user123'
    }
  }),
}));

describe('RenderResultScreen', () => {
  test('should render without crashing', () => {
    // Just test that the component can be imported and rendered without errors
    expect(() => {
      render(<RenderResultScreen />);
    }).not.toThrow();
  });
});