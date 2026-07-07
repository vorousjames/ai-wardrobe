import { RenderPipeline } from '../../lib/rendering/RenderPipeline';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    insert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

describe('RenderPipeline', () => {
  test('should be defined', () => {
    const renderPipeline = new RenderPipeline();
    expect(renderPipeline).toBeDefined();
  });
});
