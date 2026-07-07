import React from 'react';
import { render } from '@testing-library/react-native';
import ScanProgressScreen from '../../app/onboarding/ScanProgressScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../lib/supabase', () => {
  const single = jest.fn().mockResolvedValue({ data: { body_scan_status: 'processing' }, error: null });
  const eq = jest.fn().mockImplementation(() => ({ single }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { supabase: { from } };
});

jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user-id' } } }),
}));

describe('ScanProgressScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders without crashing', async () => {
    const { toJSON } = await render(<ScanProgressScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows title', async () => {
    const { getByText } = await render(<ScanProgressScreen />);
    expect(getByText('Scan Progress')).toBeTruthy();
  });
});
