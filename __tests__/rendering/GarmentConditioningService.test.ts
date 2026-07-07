import { GarmentConditioningService } from '../../lib/rendering/GarmentConditioningService';

describe('GarmentConditioningService', () => {
  let garmentService: GarmentConditioningService;

  beforeEach(() => {
    garmentService = new GarmentConditioningService();
  });

  describe('preprocessing', () => {
    test('should download and preprocess garment images', async () => {
      const garmentId = 'garment123';
      
      const conditionedPath = await garmentService.prepareGarmentConditioning(garmentId);
      
      expect(conditionedPath).toContain('conditioned_garment123.bin');
      expect(garmentService.isConditioningReady(garmentId)).toBe(true);
    });

    test('should return cached path for subsequent requests', async () => {
      const garmentId = 'garment123';
      
      // First preparation
      const firstPath = await garmentService.prepareGarmentConditioning(garmentId);
      
      // Second preparation should return cached path immediately
      const secondPath = await garmentService.prepareGarmentConditioning(garmentId);
      
      expect(firstPath).toBe(secondPath);
      expect(garmentService.getCachedConditioningPath(garmentId)).toBe(firstPath);
    });

    test('should handle concurrent preparations of same garment', async () => {
      const garmentId = 'garment123';
      
      // Start two concurrent preparations
      const promise1 = garmentService.prepareGarmentConditioning(garmentId);
      const promise2 = garmentService.prepareGarmentConditioning(garmentId);
      
      // Both should resolve to the same path
      const [path1, path2] = await Promise.all([promise1, promise2]);
      
      expect(path1).toBe(path2);
    });
  });

  describe('cache management', () => {
    test('should clear garment conditioning cache', async () => {
      const garmentId = 'garment123';
      
      // Prepare conditioning
      await garmentService.prepareGarmentConditioning(garmentId);
      
      // Verify it's cached
      expect(garmentService.isConditioningReady(garmentId)).toBe(true);
      
      // Clear cache
      garmentService.clearConditioningCache(garmentId);
      
      // Should no longer be ready
      expect(garmentService.isConditioningReady(garmentId)).toBe(false);
    });
  });
});