import { RenderRequest, RenderResult, RenderStatus, RenderProgress } from './types';

export type RenderProgressCallback = (progress: RenderProgress) => void;

export class RenderService {
  private renderQueue: RenderRequest[] = [];
  private renderStatus: Map<string, RenderStatus> = new Map(); // request_id -> status
  private renderResults: Map<string, RenderResult> = new Map(); // request_id -> result
  private progressCallbacks: Map<string, RenderProgressCallback> = new Map();
  private isProcessing: boolean = false;

  constructor() {
    // Initialize render service
  }

  /**
   * Submit a render request to the queue
   */
  public async submitRenderRequest(
    request: RenderRequest,
    onProgress?: RenderProgressCallback
  ): Promise<string> {
    // Generate unique request ID
    const requestId = this.generateRequestId(request);
    
    // Add to queue
    this.renderQueue.push(request);
    this.renderStatus.set(requestId, RenderStatus.PENDING);
    
    // Register progress callback if provided
    if (onProgress) {
      this.progressCallbacks.set(requestId, onProgress);
    }
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return requestId;
  }

  /**
   * Get the status of a render request
   */
  public getRenderStatus(requestId: string): RenderStatus | undefined {
    return this.renderStatus.get(requestId);
  }

  /**
   * Get the result of a completed render request
   */
  public getRenderResult(requestId: string): RenderResult | undefined {
    return this.renderResults.get(requestId);
  }

  /**
   * Cancel a pending render request
   */
  public cancelRenderRequest(requestId: string): boolean {
    if (this.renderStatus.get(requestId) !== RenderStatus.PENDING) {
      return false;
    }
    
    // Remove from queue
    this.renderQueue = this.renderQueue.filter(req => 
      this.generateRequestId(req) !== requestId
    );
    
    // Update status
    this.renderStatus.set(requestId, RenderStatus.FAILED);
    this.reportProgress(requestId, { 
      status: RenderStatus.FAILED, 
      error: 'Request cancelled' 
    });
    
    // Clean up
    this.progressCallbacks.delete(requestId);
    
    return true;
  }

  /**
   * Process the render queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.renderQueue.length > 0) {
      const request = this.renderQueue.shift()!;
      const requestId = this.generateRequestId(request);
      
      try {
        // Update status to processing
        this.renderStatus.set(requestId, RenderStatus.PROCESSING);
        this.reportProgress(requestId, { 
          status: RenderStatus.PROCESSING, 
          progress: 0,
          message: 'Starting render process'
        });
        
        // Simulate render process with progress updates
        const result = await this.mockRenderProcess(request, requestId);
        
        // Store result
        this.renderResults.set(requestId, result);
        this.renderStatus.set(requestId, RenderStatus.COMPLETE);
        this.reportProgress(requestId, { 
          status: RenderStatus.COMPLETE, 
          progress: 100,
          message: 'Render complete'
        });
      } catch (error) {
        // Handle error
        this.renderStatus.set(requestId, RenderStatus.FAILED);
        this.reportProgress(requestId, { 
          status: RenderStatus.FAILED, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        // Clean up progress callback
        this.progressCallbacks.delete(requestId);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Mock render process that simulates Stable Diffusion inference
   */
  private async mockRenderProcess(
    request: RenderRequest, 
    requestId: string
  ): Promise<RenderResult> {
    // Simulate multi-step process with progress updates
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Report progress
      const progress = Math.round(((i + 1) / steps) * 100);
      this.reportProgress(requestId, { 
        status: RenderStatus.PROCESSING, 
        progress,
        message: `Processing step ${i + 1} of ${steps}`
      });
    }
    
    // Generate mock result
    const cacheKey = `render_${requestId}_${Date.now()}`;
    const imageUrl = `file:///tmp/${cacheKey}.png`;
    
    return {
      image_url: imageUrl,
      cache_key: cacheKey,
      timestamp: Date.now()
    };
  }

  /**
   * Report progress to callback if registered
   */
  private reportProgress(requestId: string, progress: RenderProgress): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Generate a unique request ID based on request content
   */
  private generateRequestId(request: RenderRequest): string {
    const content = `${request.user_id}_${request.garment_ids.join('_')}_${request.pose}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Clear completed results (for memory management)
   */
  public clearCompletedResults(): void {
    this.renderStatus.forEach((status, requestId) => {
      if (status === RenderStatus.COMPLETE || status === RenderStatus.FAILED) {
        this.renderStatus.delete(requestId);
        this.renderResults.delete(requestId);
        this.progressCallbacks.delete(requestId);
      }
    });
  }
}