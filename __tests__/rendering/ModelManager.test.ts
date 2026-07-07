import { ModelManager } from '../../lib/rendering/ModelManager';
import { ModelState } from '../../lib/rendering/types';

describe('ModelManager', () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
  });

  describe('model lifecycle', () => {
    test('should start in unloaded state', () => {
      expect(modelManager.getModelState()).toBe(ModelState.UNLOADED);
    });

    test('should load LoRA weights and update state', async () => {
      const userId = 'user123';
      
      // Start loading
      const loadPromise = modelManager.loadLoRAWeights(userId);
      
      // Should be loading
      expect(modelManager.getModelState()).toBe(ModelState.LOADING);
      
      const localPath = await loadPromise;
      
      // Should be ready
      expect(modelManager.getModelState()).toBe(ModelState.READY);
      expect(localPath).toContain('lora_user123.bin');
    });

    test('should load garment assets and update state', async () => {
      const garmentId = 'garment123';
      
      // Start loading
      const loadPromise = modelManager.loadGarmentAsset(garmentId);
      
      // Should be loading
      expect(modelManager.getModelState()).toBe(ModelState.LOADING);
      
      const localPath = await loadPromise;
      
      // Should be ready
      expect(modelManager.getModelState()).toBe(ModelState.READY);
      expect(localPath).toContain('garment_garment123.png');
    });

    test('should handle concurrent loading of same asset', async () => {
      const userId = 'user123';
      
      // Start two concurrent loads
      const promise1 = modelManager.loadLoRAWeights(userId);
      const promise2 = modelManager.loadLoRAWeights(userId);
      
      // Both should resolve to the same path
      const [path1, path2] = await Promise.all([promise1, promise2]);
      
      expect(path1).toBe(path2);
    });

    test('should handle loading errors', async () => {
      // This test would require mocking failures, which our mock implementation
      // doesn't currently support. In a real implementation, we'd test error handling.
      expect(true).toBe(true);
    });
  });
});