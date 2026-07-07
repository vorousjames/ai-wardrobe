import ExpoModulesCore
import MLStableDiffusion

public class AiRendererModule: Module {
  private var diffusionPipeline: MLStableDiffusionPipeline?
  private var isModelLoaded = false
  
  public func definition() -> ModuleDefinition {
    Name("AiRenderer")
    
    Function("loadModel") { (modelPath: String) -> Promise in
      let promise = Promise()
      
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          // Load the model using Apple's MLStableDiffusion
          let config = MLStableDiffusionPipeline.Configuration()
          self.diffusionPipeline = try MLStableDiffusionPipeline(
            modelAt: URL(fileURLWithPath: modelPath),
            configuration: config
          )
          self.isModelLoaded = true
          promise.resolve()
        } catch {
          promise.reject("MODEL_LOAD_ERROR", "Failed to load model: \(error.localizedDescription)", error)
        }
      }
      
      return promise
    }
    
    Function("generate") { (prompt: String, garmentImagePath: String?, loraPath: String?) -> Promise in
      let promise = Promise()
      
      DispatchQueue.global(qos: .userInitiated).async {
        guard let pipeline = self.diffusionPipeline else {
          promise.reject("PIPELINE_NOT_READY", "Model not loaded", nil)
          return
        }
        
        do {
          // Prepare generation parameters
          var options = MLStableDiffusionPipeline.ImageGenerationOptions(
            prompt: prompt,
            negativePrompt: nil,
            stepCount: 50,
            seed: UInt32.random(in: 0...UInt32.max)
          )
          
          // Apply LoRA if provided
          if let loraPath = loraPath {
            // Note: This is a simplified implementation
            // In practice, you would need to integrate LoRA weights
            // with the stable diffusion model
            print("LoRA path provided: \(loraPath)")
          }
          
          // Generate image
          let result = try pipeline.generateImage(options: options)
          
          // Save image to temporary file
          let tempDir = FileManager.default.temporaryDirectory
          let fileName = "generated_\(UUID().uuidString).png"
          let fileURL = tempDir.appendingPathComponent(fileName)
          
          // Convert CGImage to UIImage and save
          if let cgImage = result.cgImage {
            let uiImage = UIImage(cgImage: cgImage)
            if let data = uiImage.pngData() {
              try data.write(to: fileURL)
              promise.resolve(fileURL.path)
              return
            }
          }
          
          promise.reject("IMAGE_SAVE_ERROR", "Failed to save generated image", nil)
        } catch {
          promise.reject("GENERATION_ERROR", "Failed to generate image: \(error.localizedDescription)", error)
        }
      }
      
      return promise
    }
    
    Function("unloadModel") { () -> Promise in
      let promise = Promise()
      
      DispatchQueue.global(qos: .userInitiated).async {
        self.diffusionPipeline = nil
        self.isModelLoaded = false
        promise.resolve()
      }
      
      return promise
    }
    
    Function("isModelLoaded") { () -> Bool in
      return self.isModelLoaded
    }
  }
}