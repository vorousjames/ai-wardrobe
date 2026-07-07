import React from 'react';
import { render } from '@testing-library/react-native';
import BodyScanScreen from '../../app/onboarding/BodyScanScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('BodyScanScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders instructions', async () => {
    const { getByText } = await render(<BodyScanScreen />);
    expect(getByText('Body Scan Setup')).toBeTruthy();
    expect(getByText('Instructions')).toBeTruthy();
    expect(getByText('Start Body Scan')).toBeTruthy();
  });

  it('shows instructions for proper clothing', async () => {
    const { getByText } = await render(<BodyScanScreen />);
    expect(getByText('• Wear form-fitting clothing (leggings, tank top, or swimsuit)')).toBeTruthy();
    expect(getByText('• Slowly turn 360° in front of the camera')).toBeTruthy();
  });
});
