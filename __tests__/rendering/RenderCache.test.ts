import { RenderPipeline } from '../../lib/rendering/RenderPipeline';
import { RenderRequest, RenderResult } from '../../lib/rendering/types';
import { supabase } from '../../lib/supabase';

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis()
    })
  }
}));

// Mock native renderer
jest.mock('../../modules/ai-renderer', () => ({
  default: null
}), { virtual: true });

describe('Render Cache Integration', () => {
  let renderPipeline: RenderPipeline;
  let mockRequest: RenderRequest;

  beforeEach(() => {
    renderPipeline = new RenderPipeline();
    mockRequest = {
      garment_ids: ['garment1', 'garment2'],
      pose: 'front',
      user_id: 'user123'
    };
  });

  test('generates consistent cache keys', () => {
    const request1: RenderRequest = {
      garment_ids: ['a', 'b', 'c'],
      pose: 'front',
      user_id: 'user123'
    };
    
    const request2: RenderRequest = {
      garment_ids: ['c', 'b', 'a'], // Same IDs, different order
      pose: 'front',
      user_id: 'user123'
    };
    
    // Cache keys should be the same regardless of garment order
    const key1 = (renderPipeline as any).generateCacheKey(request1);
    const key2 = (renderPipeline as any).generateCacheKey(request2);
    
    expect(key1).toBe(key2);
  });

  test('checks cache before rendering', async () => {
    // Mock cached result
    const mockCachedResult = {
      id: 'cache123',
      cache_key: 'render_12345',
      image_url: 'https://example.com/cached.jpg',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString() // 1 day from now
    };
    
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockCachedResult, error: null })
    });
    
    const result = await renderPipeline.getCachedResult(mockRequest);
    
    expect(result).toBeDefined();
    expect(result?.image_url).toBe('https://example.com/cached.jpg');
  });

  test('caches render results', async () => {
    const mockResult: RenderResult = {
      image_url: 'https://example.com/result.jpg',
      cache_key: 'render_12345',
      timestamp: Date.now()
    };
    
    // Mock the upsert function
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertMock
    });
    
    // Call cacheRenderResult directly
    await (renderPipeline as any).cacheRenderResult(mockRequest, mockResult);
    
    expect(upsertMock).toHaveBeenCalled();
  });

  test('uses cached result when available', async () => {
    // Mock cached result
    const mockCachedResult = {
      id: 'cache123',
      cache_key: 'render_12345',
      image_url: 'https://example.com/cached.jpg',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString()
    };
    
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockCachedResult, error: null })
    });
    
    const onProgress = jest.fn();
    const result = await renderPipeline.renderOutfit(mockRequest, onProgress);
    
    expect(result.image_url).toBe('https://example.com/cached.jpg');
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      status: 'complete',
      message: 'Using cached result'
    }));
  });
});