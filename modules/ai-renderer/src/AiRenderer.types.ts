export interface AiRendererModule {
  loadModel(modelPath: string): Promise<void>;
  generate(prompt: string, garmentImagePath?: string, loraPath?: string): Promise<string>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
}

export interface GenerationOptions {
  prompt: string;
  garmentImagePath?: string;
  loraPath?: string;
  guidanceScale?: number;
  stepCount?: number;
  seed?: number;
}