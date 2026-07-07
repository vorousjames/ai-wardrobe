import { RenderService } from '../../lib/rendering/RenderService';
import { ModelManager } from '../../lib/rendering/ModelManager';
import { LoRAService } from '../../lib/rendering/LoRAService';
import { GarmentConditioningService } from '../../lib/rendering/GarmentConditioningService';
import { RenderPipeline } from '../../lib/rendering/RenderPipeline';

describe('Rendering Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RenderService', () => {
    it('should be instantiable', () => {
      const renderService = new RenderService();
      expect(renderService).toBeDefined();
    });
  });

  describe('ModelManager', () => {
    it('should be instantiable', () => {
      const modelManager = new ModelManager();
      expect(modelManager).toBeDefined();
    });
  });

  describe('LoRAService', () => {
    it('should be instantiable', () => {
      const loraService = new LoRAService();
      expect(loraService).toBeDefined();
    });
  });

  describe('GarmentConditioningService', () => {
    it('should be instantiable', () => {
      const garmentConditioningService = new GarmentConditioningService();
      expect(garmentConditioningService).toBeDefined();
    });
  });

  describe('RenderPipeline', () => {
    it('should be instantiable', () => {
      const renderPipeline = new RenderPipeline();
      expect(renderPipeline).toBeDefined();
    });
  });
});