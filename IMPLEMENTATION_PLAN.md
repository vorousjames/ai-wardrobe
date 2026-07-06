# AI Outfit Generator — Implementation Plan

**Verification:** Each step ends with a testable outcome via Expo Go (SDK 54) or a development build if Expo Go doesn't support the native module.

---

## Phase 1: Foundation

### Step 1 — Project Scaffolding
**What:** Create Expo project, install core dependencies, set up navigation shell, configure Supabase client.

**Dependencies:**
- `npx create-expo-app@latest` (SDK 54)
- `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- `@supabase/supabase-js`, `@supabase/react-native`
- `expo-router` or manual navigation (your preference)
- `expo-secure-store` (for auth tokens)

**Verification:** App launches in Expo Go showing a tab navigator with 3 empty screens (Wardrobe, Outfits, Profile). No crashes.

---

### Step 2 — Supabase Auth + DB Setup
**What:** Configure Supabase project, create tables (users, garments, outfits, render_cache), implement sign-up/login flow.

**Tables:**
```sql
-- users (managed by Supabase Auth, extended with profile)
create table profiles (
  id uuid references auth.users primary key,
  body_scan_status text default 'not_started',
  lora_url text,
  lora_trained_at timestamptz,
  created_at timestamptz default now()
);

-- garments
create table garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  image_url text not null,
  segmented_url text,
  brand text,
  nickname text,
  type text not null,
  color text,
  fabric text,
  created_at timestamptz default now()
);

-- outfits
create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  garment_ids uuid[] not null,
  rendered_url text,
  pose text default 'front',
  created_at timestamptz default now()
);

-- render_cache
create table render_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  image_url text not null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days'
);
```

**Verification:** User can sign up with email/password, sign in, and see their profile row created in the DB. Test via Expo Go.

---

### Step 3 — Navigation + Screen Shells
**What:** Wire up all screens with placeholder content. Define the full navigation tree.

**Screens:**
- `(auth)/` — LoginScreen, SignUpScreen
- `(tabs)/` — WardrobeScreen, OutfitBuilderScreen, ProfileScreen
- `wardrobe/` — GarmentUploadScreen, GarmentDetailScreen
- `onboarding/` — BodyScanScreen, ScanProgressScreen
- `outfit/` — RenderResultScreen

**Verification:** Navigate between all screens via tabs and stack pushes. Each screen shows its name as a title. Test in Expo Go.

---

## Phase 2: Wardrobe (Garment Management)

### Step 4 — Garment Upload (Camera + Gallery)
**What:** User can take a photo or pick from gallery. Image uploads to Supabase Storage. Metadata form (brand, nickname, type, color, fabric).

**Dependencies:**
- `expo-image-picker`
- `expo-file-system`
- Supabase Storage bucket: `garments/{user_id}/{garment_id}.jpg`

**Verification:** Take a photo of a shirt → fill in metadata → tap save → garment appears in Supabase `garments` table with image URL. Test in Expo Go.

---

### Step 5 — Garment List View
**What:** Grid display of user's uploaded garments. Each card shows the garment image + nickname + type badge. Pull-to-refresh.

**Verification:** After uploading 3 garments, the Wardrobe tab shows them in a 2-column grid. Pull down refreshes. Tap a garment → navigates to detail screen. Test in Expo Go.

---

### Step 6 — Garment Detail + Delete
**What:** Full-screen garment view with metadata. Edit metadata inline. Delete garment (removes from storage + DB).

**Verification:** Tap garment → see full image + all metadata fields → edit nickname → save → grid updates. Delete → garment disappears from grid and storage. Test in Expo Go.

---

## Phase 3: Body Scan

### Step 7 — 360° Video Recording
**What:** User records a slow 360° turn in form-fitting clothes. Instructions screen before recording. Preview + retake.

**Dependencies:**
- `expo-camera`
- `expo-av` (video playback for preview)
- Upload to Supabase Storage: `scans/{user_id}/{scan_id}.mp4`

**Verification:** Record a 360° video → preview plays back → tap "Use" → video uploads to Supabase Storage → `profiles.body_scan_status` updates to `uploaded`. Test in Expo Go (camera permissions may need dev build).

---

### Step 8 — LoRA Training Pipeline (Server)
**What:** Server-side script that:
1. Downloads the 360° video from Supabase Storage
2. Extracts frames at regular intervals
3. Runs SMPL-X body parameter extraction
4. Generates 15-30 synthetic training images from multiple angles
5. Trains a user-specific SDXL LoRA
6. Uploads LoRA weights to Cloudflare R2
7. Updates `profiles.lora_url` and `profiles.body_scan_status = 'complete'`

**Implementation:** Python script deployed on RunPod as a serverless endpoint or long-running job.

**Verification:** Upload a test video → poll `profiles.body_scan_status` → status changes to `processing` → eventually `complete` → `lora_url` is populated. Download the LoRA file and verify it's a valid `.safetensors` file (~10-50MB).

---

### Step 9 — Scan Progress Screen
**What:** After uploading the video, show a progress screen that polls `profiles.body_scan_status`. States: uploading → processing (with ETA) → complete (with "Continue" button) → failed (with retry).

**Verification:** Upload video → see progress screen → status transitions from `uploaded` → `processing` → `complete` → "Continue" button appears. Test in Expo Go (UI only, backend polling).

---

## Phase 4: Garment Segmentation (Server)

### Step 10 — Garment Segmentation Pipeline
**What:** When a garment is uploaded, a server-side function:
1. Downloads the garment image from Supabase Storage
2. Runs SAM (Segment Anything Model) to isolate the garment
3. Outputs a clean transparent PNG
4. Uploads segmented image to Cloudflare R2
5. Updates `garments.segmented_url`

**Implementation:** RunPod serverless function triggered by Supabase webhook on `garments` INSERT.

**Verification:** Upload a garment photo → wait ~10-30s → `garments.segmented_url` is populated → download the URL and verify it's a transparent PNG of just the garment. No background.

---

## Phase 5: On-Device Rendering

### Step 11 — Core ML Stable Diffusion Integration
**What:** Bundle a distilled SD 1.5 Core ML model in the app. Implement on-device inference using Apple's `ml-stable-diffusion` Swift package via Expo native module.

**Dependencies:**
- Apple's `ml-stable-diffusion` (Swift package)
- Expo module template (`expo-module-core`)
- Convert SD 1.5 to Core ML format (Apple's conversion script)
- Compress to ~1-2GB for app bundle

**Note:** This requires a **development build** (Expo Go doesn't support custom native modules). The app will need `npx expo run:ios` for testing.

**Verification:** Tap "Test Render" on a debug screen → app generates a 512×512 image from a text prompt → image displays on screen. Time the generation (~10-15s expected).

---

### Step 12 — IP-Adapter On-Device
**What:** Implement lightweight IP-Adapter conditioning on-device. This takes a garment image and conditions the SD generation to apply that garment's appearance.

**Implementation:** Convert IP-Adapter to Core ML format. The garment's segmented PNG is passed as conditioning input alongside the text prompt.

**Verification:** Generate an image with garment conditioning → the output should clearly show the garment's pattern/color/texture applied to a person. Compare with/without conditioning to verify it's working.

---

### Step 13 — User LoRA Loading
**What:** Download the user's LoRA weights from Cloudflare R2 on app launch. Apply LoRA during SD inference to match the user's body shape and face.

**Verification:** Generate an image with user LoRA applied → the person in the output should resemble the user (body shape, face, skin tone). Without LoRA → generic person. With LoRA → specific user.

---

### Step 14 — Full Outfit Render Pipeline (On-Device)
**What:** Combine all pieces:
1. Load user LoRA
2. Load garment IP-Adapter conditioning (for each selected garment)
3. Run SD 1.5 inference with both conditioning signals
4. Output 512×512 photorealistic image of user wearing the outfit

**Verification:** Select shirt-A + pants-1 → tap "Render" → wait ~15s → see a photorealistic image of the user wearing that specific combination. Swap pants-1 for pants-2 → re-render → see the same user with different pants. The face, body, and skin tone should be consistent across renders.

---

## Phase 6: Outfit Builder UI

### Step 15 — Outfit Builder Screen
**What:** UI for selecting garments to compose an outfit. Sections for each garment type (top, bottom, etc.). User taps to select one of each type. "Render" button at bottom.

**Verification:** Open Outfit Builder → see garment grid filtered by type → tap a top → it highlights → tap a bottom → it highlights → tap "Render" → progress indicator appears. Test in Expo Go (render button triggers the pipeline, result display comes next).

---

### Step 16 — Render Progress + Result
**What:** After tapping "Render":
1. Show progress indicator (spinning + "Generating your outfit...")
2. On-device pipeline runs (Steps 11-14)
3. Result image displays full-screen
4. Buttons: Save, Share, Try Different Pose

**Verification:** Full flow: select garments → tap Render → see progress → see result image → tap Save → outfit appears in saved outfits list. Test in dev build.

---

### Step 17 — Render Cache
**What:** Before running the render pipeline, check if `(user_id, sorted_garment_ids, pose)` exists in `render_cache`. If yes, serve cached image. If no, run pipeline and cache result.

**Verification:** Render shirt-A + pants-1 → takes ~15s. Render same combo again → instant load (cached). Render shirt-A + pants-2 → takes ~15s (new combo). Test in dev build.

---

## Phase 7: Polish & Edge Cases

### Step 18 — Error Handling
**What:** Handle all failure modes:
- Network error during upload → retry button
- LoRA training failure → retry scan
- On-device render failure → fallback to server render
- Out of storage → warn user
- Camera permission denied → settings redirect

**Verification:** Turn off network → upload fails → see error state with retry. Kill RunPod job → scan fails → see failure state with retry. Test each error path.

---

### Step 19 — Loading States + Empty States
**What:** Skeleton loaders for garment grid. Empty state illustrations for "No garments yet" and "No outfits yet". Pull-to-refresh on all list screens.

**Verification:** Fresh account → see "Upload your first garment" empty state. Upload one garment → grid shows it. Pull down → refreshes. Test in Expo Go.

---

### Step 20 — Performance Optimization
**What:**
- Image compression before upload (max 1024×1024)
- Lazy load garment images in grid (expo-image with blurhash)
- Pre-download LoRA on app launch (background)
- Warm up Core ML model on app launch (reduces first render from 15s to 8s)
- Batch garment segmentation requests

**Verification:** Upload a 12MP photo → it's compressed to <500KB. Scroll garment grid → images load progressively. First render after app launch is slower than subsequent renders. Test on a real device.

---

## Summary: Verification Method by Step

| Step | Verification Method |
|---|---|
| 1-6, 9, 15, 18-20 | **Expo Go** (SDK 54) |
| 7 | **Expo Go** (camera works) or **dev build** if permissions fail |
| 8, 10 | **Server-side** (check DB + R2 via curl/script) |
| 11-14, 16-17 | **Dev build** (`npx expo run:ios`) — Core ML native modules |
