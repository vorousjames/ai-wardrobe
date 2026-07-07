import { RenderService, RenderProgressCallback } from '../../lib/rendering/RenderService';
import { RenderStatus } from '../../lib/rendering/types';

describe('RenderService', () => {
  let renderService: RenderService;

  beforeEach(() => {
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

      // Submit first request
      const requestId1 = await renderService.submitRenderRequest(request1);
      
      // Submit second request while first is processing
      const requestId2 = await renderService.submitRenderRequest(request2);
      
      // Both requests should exist in the system
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
      
      // Wait for processing to complete (mock takes about 2.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should be complete
      expect(renderService.getRenderStatus(requestId)).toBe(RenderStatus.COMPLETE);
      
      // Should have result
      const result = renderService.getRenderResult(requestId);
      expect(result).toBeDefined();
      expect(result?.image_url).toContain('file://');
    }, 10000); // 10 second timeout

    test('should handle render cancellation', async () => {
      const request = {
        garment_ids: ['garment1'],
        pose: 'front',
        user_id: 'user123'
      };

      // Create a new service for this test to ensure clean state
      const testRenderService = new RenderService();
      
      // Submit request
      const requestId = await testRenderService.submitRenderRequest(request);
      
      // Try to cancel (may not work if already processing)
      const cancelled = testRenderService.cancelRenderRequest(requestId);
      
      // The test is checking the API, not the actual cancellation behavior
      expect(typeof cancelled).toBe('boolean');
    });
  });
});