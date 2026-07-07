import { AiRendererModule, GenerationOptions } from '../../lib/rendering/types';

describe('AiRendererModule Types', () => {
  test('should define AiRendererModule interface correctly', () => {
    // This test ensures the interface is correctly defined
    // In a real test, we would actually test the implementation
    const module: Partial<AiRendererModule> = {
      loadModel: async (modelPath: string) => {},
      generate: async (prompt: string, garmentImagePath?: string, loraPath?: string) => '',
      unloadModel: async () => {},
      isModelLoaded: () => false
    };
    
    expect(module).toBeDefined();
  });

  test('should define GenerationOptions interface correctly', () => {
    const options: GenerationOptions = {
      prompt: 'test prompt',
      garmentImagePath: '/path/to/garment.jpg',
      loraPath: '/path/to/lora.bin',
      guidanceScale: 7.5,
      stepCount: 50,
      seed: 12345
    };
    
    expect(options.prompt).toBe('test prompt');
    expect(options.garmentImagePath).toBe('/path/to/garment.jpg');
    expect(options.loraPath).toBe('/path/to/lora.bin');
    expect(options.guidanceScale).toBe(7.5);
    expect(options.stepCount).toBe(50);
    expect(options.seed).toBe(12345);
  });
});