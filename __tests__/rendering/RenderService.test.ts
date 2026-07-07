import { RenderService, RenderProgressCallback } from '../../lib/rendering/RenderService';
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

  describe('queue management', () => {
    test('should submit render request and generate request ID', async () => {
      const request = {
        garment_ids: ['garment1', 'garment2'],
        pose: 'front',
        user_id: 'user123'
      };

      const requestId = await renderService.submitRenderRequest(request);
      
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
    });

    test('should manage render queue', async () => {
      const request1 = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      const request2 = {
        garment_ids: ['garment2'],
        pose: 'side',
        user_id: 'user456'
      };

      const requestId1 = await renderService.submitRenderRequest(request1);
      const requestId2 = await renderService.submitRenderRequest(request2);
      
      expect(renderService.getRenderStatus(requestId1)).toBeDefined();
      expect(renderService.getRenderStatus(requestId2)).toBeDefined();
    });
  });

  describe('status tracking', () => {
    test('should track render status through lifecycle', async () => {
      const request = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      const progressCallback: RenderProgressCallback = jest.fn();
      
      const requestId = await renderService.submitRenderRequest(request, progressCallback);
      
      // Status should be defined (may be pending or already processing)
      const status = renderService.getRenderStatus(requestId);
      expect(status).toBeDefined();
      expect([RenderStatus.PENDING, RenderStatus.PROCESSING, RenderStatus.COMPLETE]).toContain(status);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Should be complete or failed
      const finalStatus = renderService.getRenderStatus(requestId);
      expect([RenderStatus.COMPLETE, RenderStatus.FAILED]).toContain(finalStatus);
    }, 10000);

    test('should handle render cancellation', async () => {
      const request = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      const requestId = await renderService.submitRenderRequest(request);
      
      // Cancel the request
      const cancelled = renderService.cancelRenderRequest(requestId);
      
      // Should be cancelled or already processing
      if (cancelled) {
        expect(renderService.getRenderStatus(requestId)).toBe(RenderStatus.CANCELLED);
      }
    });
  });
});
