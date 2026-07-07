import { LoRAService, LoRAProgressCallback } from '../../lib/rendering/LoRAService';

describe('LoRAService', () => {
  let loraService: LoRAService;

  beforeEach(() => {
    loraService = new LoRAService();
  });

  describe('download and cache', () => {
    test('should download LoRA weights and cache them', async () => {
      const userId = 'user123';
      const progressCallback: LoRAProgressCallback = jest.fn();
      
      const localPath = await loraService.loadUserLoRA(userId, progressCallback);
      
      expect(localPath).toContain('lora_user123.safetensors');
      expect(loraService.isLoRAReady(userId)).toBe(true);
      expect(loraService.getCachedLoRAPath(userId)).toBe(localPath);
    });

    test('should return cached path for subsequent requests', async () => {
      const userId = 'user123';
      
      // First load
      const firstPath = await loraService.loadUserLoRA(userId);
      
      // Second load should return cached path immediately
      const secondPath = await loraService.loadUserLoRA(userId);
      
      expect(firstPath).toBe(secondPath);
    });

    test('should handle concurrent downloads of same LoRA', async () => {
      const userId = 'user123';
      
      // Start two concurrent downloads
      const promise1 = loraService.loadUserLoRA(userId);
      const promise2 = loraService.loadUserLoRA(userId);
      
      // Both should resolve to the same path
      const [path1, path2] = await Promise.all([promise1, promise2]);
      
      expect(path1).toBe(path2);
    });

    test('should track LoRA status', async () => {
      const userId = 'user123';
      
      // Should start as idle
      expect(loraService.getLoRAStatus(userId)).toBe('idle');
      
      // Start loading
      const loadPromise = loraService.loadUserLoRA(userId);
      
      // Should be downloading
      expect(loraService.getLoRAStatus(userId)).toBe('downloading');
      
      await loadPromise;
      
      // Should be ready
      expect(loraService.getLoRAStatus(userId)).toBe('ready');
    });
  });

  describe('cache management', () => {
    test('should clear user LoRA cache', async () => {
      const userId = 'user123';
      
      // Load LoRA
      await loraService.loadUserLoRA(userId);
      
      // Verify it's cached
      expect(loraService.isLoRAReady(userId)).toBe(true);
      
      // Clear cache
      loraService.clearUserLoRACache(userId);
      
      // Should be back to idle
      expect(loraService.getLoRAStatus(userId)).toBe('idle');
    });
  });
});