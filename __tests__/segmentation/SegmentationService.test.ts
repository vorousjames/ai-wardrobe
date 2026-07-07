import { SegmentationService } from '../../lib/segmentation/SegmentationService';

describe('Segmentation Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SegmentationService', () => {
    it('should be instantiable', () => {
      const segmentationService = new SegmentationService();
      expect(segmentationService).toBeDefined();
    });
  });
});