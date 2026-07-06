# AI Outfit Generator — Architecture Plan

## AI Stack (MVP)

### 1. Body Scan → User LoRA (Server, one-time per user)

| Component | Tool | Cost |
|---|---|---|
| 360° video → body parameters | **SMPL-X extraction** via 4DHuman/OpenPose | ~$0.01/video (RunPod) |
| LoRA training | **SDXL LoRA trainer** (kohya_ss or sd-scripts) | ~$1-2/user (one-time) |
| Storage | LoRA weights (~10-50MB) → Cloudflare R2 | ~$0.01/user/mo |

**Flow:** User records 360° video → server extracts SMPL body params → generates 15-30 synthetic training images from multiple angles → trains user-specific LoRA → app downloads LoRA on next launch.

### 2. Garment Segmentation (Server, one-time per garment)

| Component | Tool | Cost |
|---|---|---|
| Garment isolation | **CLIPSeg + SAM** (segment anything) | ~$0.01/garment (RunPod) |
| Clean garment image | Output: transparent PNG of garment only | — |
| Storage | Garment asset → Cloudflare R2 | ~$0.001/garment/mo |

**Flow:** User uploads clothing photo → server runs SAM to segment garment from background/person → stores clean garment image → app downloads asset.

### 3. Outfit Rendering (On-Device, per request)

| Component | Tool | Cost |
|---|---|---|
| Base model | **Stable Diffusion 1.5** (Core ML optimized) | $0 (on-device) |
| User body | **User LoRA** (downloaded from R2) | $0 |
| Garment conditioning | **IP-Adapter** (lightweight, runs on-device) | $0 |
| Resolution | 512×512 (MVP) | $0 |
| Speed | ~10-15s per render on iPhone 15 Pro+ | $0 |

**Flow:** User picks shirt-A + pants-1 → app loads user LoRA + garment IP-Adapter → runs distilled SD 1.5 on-device → displays result.

### 4. Server Rendering Fallback (Optional Tier)

| Component | Tool | Cost |
|---|---|---|
| Full pipeline | **SDXL + IP-Adapter + LoRA** on RunPod | ~$0.05-0.10/render |
| Resolution | 1024×1024 | — |
| Speed | ~3-5s | — |

**Use for:** Android users, premium tier, or when on-device quality isn't sufficient.

---

## Data Model

### User
```
id: uuid
name: string
body_scan_status: enum (pending, processing, complete)
lora_url: string (R2 path)
lora_trained_at: timestamp
created_at: timestamp
```

### Garment
```
id: uuid
user_id: uuid (FK)
image_url: string (original upload)
segmented_url: string (clean garment PNG, R2)
brand: string
nickname: string
type: enum (top, bottom, dress, outerwear, shoes, accessory)
color: string
fabric: string
created_at: timestamp
```

### Outfit
```
id: uuid
user_id: uuid (FK)
garment_ids: uuid[] (ordered: base layer → outer)
rendered_url: string (R2, cached render)
pose: enum (front, back)
created_at: timestamp
```

### Render Cache
```
key: hash(user_id + sorted_garment_ids + pose)
image_url: string (R2)
created_at: timestamp
expires_at: timestamp
```

---

## API Endpoints

### Body Scan
- `POST /api/scan/upload` — upload 360° video
- `GET /api/scan/status` — poll LoRA training status
- `GET /api/scan/lora` — download trained LoRA weights

### Garments
- `POST /api/garments` — upload clothing photo + metadata
- `GET /api/garments` — list user's garments
- `DELETE /api/garments/:id` — remove garment

### Outfits
- `POST /api/outfits/render` — request render (garment_ids + pose)
- `GET /api/outfits/:id` — get render result
- `GET /api/outfits` — list user's saved outfits

### Cache
- Render cache keyed by `(user_id, sorted_garment_ids, pose)`
- TTL: 30 days (or until user rescan/resegment)

---

## Component Tree (Expo)

```
App
├── Onboarding
│   ├── BodyScanScreen (360° video recording)
│   └── ScanProgressScreen (LoRA training status)
├── Wardrobe
│   ├── GarmentListScreen (grid of user's garments)
│   ├── GarmentUploadScreen (camera + metadata form)
│   └── GarmentDetailScreen (view/edit metadata)
├── OutfitBuilder
│   ├── OutfitBuilderScreen (select top + bottom + etc.)
│   ├── RenderProgressScreen (on-device generation)
│   └── RenderResultScreen (view + save + share)
└── Profile
    └── SettingsScreen (rescan, manage storage)
```

---

## Infrastructure

| Service | Use | Cost (MVP) |
|---|---|---|
| **Expo** | App framework | Free |
| **Supabase** | Auth + DB + storage | Free tier |
| **Cloudflare R2** | LoRA weights, garment assets, cached renders | ~$0.015/GB/mo |
| **RunPod** | GPU for LoRA training + garment segmentation | ~$0.50-1.00/hr (spot) |
| **On-device** | Outfit rendering (iOS Core ML) | $0 |

---

## Cost Per User (MVP)

| Operation | Cost |
|---|---|
| Body scan → LoRA training | $1.50 (one-time) |
| Garment segmentation (10 garments) | $0.10 (one-time) |
| On-device rendering (unlimited) | $0 |
| Storage (LoRA + 10 garments) | ~$0.01/mo |
| **Total per user (first month)** | **~$1.61** |
| **Total per user (ongoing)** | **~$0.01/mo** |

---

## Key Technical Decisions

1. **On-device rendering** is the scalability unlock — server costs are near-zero after the initial LoRA training
2. **User LoRA** captures body shape, face, skin tone in a tiny file — no need to store or transmit full body scans
3. **Garment segmentation** is a one-time cost per garment — after that, the clean asset is reusable across any outfit combination
4. **Render caching** prevents redundant generations — same outfit combo = instant load
5. **iOS-first for on-device** — Core ML SD support is mature. Android fallback to server rendering until ExecuTorch/MLC AI catches up
