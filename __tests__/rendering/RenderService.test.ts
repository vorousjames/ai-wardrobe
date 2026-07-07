import { RenderService } from '../../lib/rendering/RenderService';
import { RenderStatus } from '../../lib/rendering/types';

// Mock supabase for RenderPipeline
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

describe('RenderService', () => {
  let renderService: RenderService;

  beforeEach(() => {
    jest.clearAllMocks();
    renderService = new RenderService();
  });

  test('should submit render request and generate request ID', async () => {
    const request = {
      garment_ids: ['garment1', 'garment2'],
      pose: 'front',
      user_id: 'user123'
    };

    const requestId = await renderService.submitRenderRequest(request);
    
    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe('string');
  }, 5000);

  test('should have status defined after submission', async () => {
    const request = {
      garment_ids: ['garment1'],
      pose: 'front',
      user_id: 'user123'
    };

    const requestId = await renderService.submitRenderRequest(request);
    
    const status = renderService.getRenderStatus(requestId);
    expect(status).toBeDefined();
  }, 5000);
});
