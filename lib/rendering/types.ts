export interface RenderRequest {
  garment_ids: string[];
  pose: string;
  user_id: string;
  options?: {
    steps?: number;
    guidance_scale?: number;
  };
}

export interface RenderResult {
  image_url: string;
  cache_key: string;
  timestamp: number;
}

export enum RenderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed'
}

export enum ModelState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

export interface RenderProgress {
  status: RenderStatus;
  progress?: number;
  message?: string;
  error?: string;
}