// profiles
export type Profile = {
  id: string;
  body_scan_status: 'not_started' | 'uploaded' | 'processing' | 'complete' | 'failed';
  lora_url: string | null;
  lora_trained_at: string | null;
  created_at: string;
};

// garments
export type Garment = {
  id: string;
  user_id: string;
  image_url: string;
  segmented_url: string | null;
  brand: string;
  nickname: string;
  type: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';
  color: string;
  fabric: string;
  created_at: string;
};

// outfits
export type Outfit = {
  id: string;
  user_id: string;
  garment_ids: string[];
  rendered_url: string | null;
  pose: 'front' | 'back';
  created_at: string;
};

// render_cache
export type RenderCache = {
  id: string;
  cache_key: string;
  image_url: string;
  created_at: string;
  expires_at: string;
};