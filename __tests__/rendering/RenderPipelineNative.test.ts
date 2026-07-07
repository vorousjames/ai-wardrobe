import { RenderPipeline } from '../../lib/rendering/RenderPipeline';
import { RenderStatus } from '../../lib/rendering/types';

// Mock the native module
jest.mock('../../modules/ai-renderer', () => {
  return {
    default: {
      loadModel: jest.fn(),
      generate: jest.fn(),
      unloadModel: jest.fn(),
      isModelLoaded: jest.fn()
    }
  };
});

describe('RenderPipeline Native Module Integration', () => {
  let renderPipeline: RenderPipeline;

  beforeEach(() => {
    renderPipeline = new RenderPipeline();
  });

  test('should fallback to mock when native module is not available', async () => {
    // This test verifies that the pipeline works even when the native module is not available
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
});