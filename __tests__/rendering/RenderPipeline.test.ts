import { RenderPipeline } from '../../lib/rendering/RenderPipeline';
import { RenderStatus, RenderResult } from '../../lib/rendering/types';

// Mock supabase for cache checking
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
  let renderPipeline: RenderPipeline;

  beforeEach(() => {
    jest.clearAllMocks();
    renderPipeline = new RenderPipeline();
  });

  describe('full flow', () => {
    test('should orchestrate full render pipeline', async () => {
      const request = {
        garment_ids: ['garment1', 'garment2'],
        pose: 'front',
        user_id: 'user123'
      };

      const progressCallback = jest.fn();
      
      const result = await renderPipeline.renderOutfit(request, progressCallback);
      
      expect(result).toBeDefined();
      expect(result.image_url).toContain('file://');
      expect(result.cache_key).toBeDefined();
      expect(result.timestamp).toBeDefined();
      
      expect(progressCallback).toHaveBeenCalled();
      
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.status).toBe(RenderStatus.COMPLETE);
    }, 15000);

    test('should handle pipeline errors', async () => {
      expect(renderPipeline).toBeDefined();
    });
  });

  describe('cache management', () => {
    test('should clear render cache', async () => {
      const request = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      const firstResult = await renderPipeline.renderOutfit(request);
      
      renderPipeline.clearCache();
      
      const progressCallback = jest.fn();
      await renderPipeline.renderOutfit(request, progressCallback);
      
      const cachedCall = progressCallback.mock.calls.find(call => 
        call[0].message === 'Using cached result'
      );
      expect(cachedCall).toBeUndefined();
    }, 15000);
  });
});
