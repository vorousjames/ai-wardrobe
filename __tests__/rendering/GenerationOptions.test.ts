import { GenerationOptions } from '../../lib/rendering/types';

describe('GenerationOptions', () => {
  test('should handle required fields', () => {
    const options: GenerationOptions = {
      prompt: 'test prompt'
    };
    
    expect(options.prompt).toBe('test prompt');
    expect(options.garmentImagePath).toBeUndefined();
    expect(options.loraPath).toBeUndefined();
    expect(options.guidanceScale).toBeUndefined();
    expect(options.stepCount).toBeUndefined();
    expect(options.seed).toBeUndefined();
  });

  test('should handle optional fields', () => {
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

  test('should handle partial optional fields', () => {
    const options: GenerationOptions = {
      prompt: 'test prompt',
      guidanceScale: 7.5
    };
    
    expect(options.prompt).toBe('test prompt');
    expect(options.garmentImagePath).toBeUndefined();
    expect(options.loraPath).toBeUndefined();
    expect(options.guidanceScale).toBe(7.5);
    expect(options.stepCount).toBeUndefined();
    expect(options.seed).toBeUndefined();
  });
});