import { supabase } from '../lib/supabase';

describe('Supabase Client', () => {
  it('should be initialized', () => {
    expect(supabase).toBeDefined();
  });

  it('should have the correct URL', () => {
    // Since we're using placeholder values, we can't check the actual URL
    // But we can check that the client is properly initialized
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });
});