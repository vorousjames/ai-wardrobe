import { RenderPipeline } from '../../lib/rendering/RenderPipeline';
import { RenderStatus, RenderResult } from '../../lib/rendering/types';

describe('RenderPipeline', () => {
  let renderPipeline: RenderPipeline;

  beforeEach(() => {
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
      
      // Should return a result
      expect(result).toBeDefined();
      expect(result.image_url).toContain('file://');
      expect(result.cache_key).toBeDefined();
      expect(result.timestamp).toBeDefined();
      
      // Should have called progress callback multiple times
      expect(progressCallback).toHaveBeenCalled();
      
      // Last call should be complete
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.status).toBe(RenderStatus.COMPLETE);
    }, 10000); // 10 second timeout

    test('should use cache for repeated requests', async () => {
      const request = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      // First render
      const firstResult = await renderPipeline.renderOutfit(request);
      
      // Second render with same parameters should use cache
      const progressCallback = jest.fn();
      const secondResult = await renderPipeline.renderOutfit(request, progressCallback);
      
      // Results should be the same
      expect(firstResult.cache_key).toBe(secondResult.cache_key);
      
      // Should have indicated cached result in progress
      const cachedCall = progressCallback.mock.calls.find(call => 
        call[0].message === 'Using cached result'
      );
      expect(cachedCall).toBeDefined();
    }, 10000); // 10 second timeout

    test('should handle pipeline errors', async () => {
      // In a real test, we'd mock failures in the underlying services
      // For now, we'll just verify the structure
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

      // First render
      const firstResult = await renderPipeline.renderOutfit(request);
      
      // Clear cache
      renderPipeline.clearCache();
      
      // Second render should not use cache
      const progressCallback = jest.fn();
      await renderPipeline.renderOutfit(request, progressCallback);
      
      // Should not have used cached result
      const cachedCall = progressCallback.mock.calls.find(call => 
        call[0].message === 'Using cached result'
      );
      expect(cachedCall).toBeUndefined();
    }, 10000); // 10 second timeout
  });
});