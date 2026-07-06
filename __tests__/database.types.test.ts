import type { Profile, Garment, Outfit, RenderCache } from '../lib/database.types';

describe('Database Types', () => {
  it('should define Profile type correctly', () => {
    const profile: Profile = {
      id: '1',
      body_scan_status: 'not_started',
      lora_url: null,
      lora_trained_at: null,
      created_at: new Date().toISOString(),
    };

    expect(profile).toBeDefined();
  });

  it('should define Garment type correctly', () => {
    const garment: Garment = {
      id: '1',
      user_id: 'user1',
      image_url: 'https://example.com/image.jpg',
      segmented_url: null,
      brand: 'Nike',
      nickname: 'Favorite Shirt',
      type: 'top',
      color: 'blue',
      fabric: 'cotton',
      created_at: new Date().toISOString(),
    };

    expect(garment).toBeDefined();
  });

  it('should define Outfit type correctly', () => {
    const outfit: Outfit = {
      id: '1',
      user_id: 'user1',
      garment_ids: ['1', '2'],
      rendered_url: null,
      pose: 'front',
      created_at: new Date().toISOString(),
    };

    expect(outfit).toBeDefined();
  });

  it('should define RenderCache type correctly', () => {
    const renderCache: RenderCache = {
      id: '1',
      cache_key: 'key1',
      image_url: 'https://example.com/image.jpg',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    expect(renderCache).toBeDefined();
  });
});