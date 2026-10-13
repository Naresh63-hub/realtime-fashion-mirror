# API Reference

All engines live under `src/` and communicate through the shared contracts in
`src/types/index.ts`. Nothing outside `src/hooks/useVirtualTryOn.ts` runs the
per-frame loop, and nothing inside `src/components/` performs CV work.

## `useVirtualTryOn(canvasRef)`

The orchestrator hook. Returns:

```ts
{
  // state
  engineReady: boolean;        // models loaded
  initializing: boolean;
  cameraActive: boolean;
  tracking: TrackingStatus;    // 'idle' | 'searching' | 'tracking' | 'coasting' | 'lost'
  garment: ClothingItem | null;
  error: AppError | null;      // user-safe message
  debugMode: boolean;
  metrics: PerformanceMetrics; // fps, frameTimeMs, poseInferenceMs, segmentationInferenceMs, inferenceFps, heapMb

  // actions
  startCamera(): Promise<void>;
  stopCamera(): void;
  switchCamera(): Promise<void>;          // front ↔ rear
  loadGarmentFile(file: File): Promise<void>;
  loadGarmentUrl(url: string, name: string): Promise<void>;
  removeGarment(): void;
  toggleDebug(): void;
  captureScreenshot(): string | null;     // PNG data URL of the composite
  setError(err: AppError | null): void;
}
```

UI sync is throttled (`PERFORMANCE.UI_SYNC_INTERVAL_MS`, default 250 ms);
the frame loop itself never triggers React renders.

## `CameraManager` — `src/camera/CameraManager.ts`

```ts
class CameraManager {
  constructor(config?: Partial<CameraConfig>);
  static isSupported(): boolean;            // secure context + getUserMedia
  async start(video: HTMLVideoElement): Promise<void>;
  stop(): void;
  async switchCamera(): Promise<void>;      // toggles facingMode
  isActive(): boolean;
  getFrameRate(): number;                   // actual device-reported fps
  getFacingMode(): 'user' | 'environment';
  dispose(): void;
}
```

Throws `CameraError` with `code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' |
'INSECURE_CONTEXT' | 'UNKNOWN'`.

## `PoseDetector` — `src/pose/PoseDetector.ts`

```ts
class PoseDetector {
  async initialize(): Promise<void>;        // creates PoseLandmarker once
  isReady(): boolean;
  detectForVideo(video: HTMLVideoElement, timestampMs: number): Pose | null;
  setGpuDelegate(useGpu: boolean): Promise<void>;
  dispose(): void;
}

interface Pose {
  landmarks: BodyLandmark[];   // 33 entries, normalized [0..1]
  timestamp: number;
  confidence: number;          // mean torso visibility
  isCoasted: boolean;
}
```

Returns `null` for duplicate frames (`video.currentTime` unchanged) or when no
person is found. Landmark indices: `LandmarkIndex` in `src/types/index.ts`.

## `SegmentationEngine` — `src/segmentation/SegmentationEngine.ts`

```ts
class SegmentationEngine {
  async initialize(): Promise<void>;
  isReady(): boolean;
  segmentForVideo(video: HTMLVideoElement, timestampMs: number): SegmentationResult | null;
  dispose(): void;
}

interface SegmentationResult {
  mask: SegmentationMask;  // { data: Uint8Array (255 = person), width, height }
  coverage: number;        // foreground ratio, sanity signal
  timestamp: number;
}
```

## `ClothingEngine` — `src/clothing/ClothingEngine.ts`

```ts
class ClothingEngine {
  async loadFromFile(file: File): Promise<ClothingItem>;    // validates type/size
  async loadFromUrl(url: string, name?: string): Promise<ClothingItem>;
  calculateWarp(pose: Pose, garment: ClothingItem, frameW: number, frameH: number): ClothingWarp;
  getCurrentGarment(): ClothingItem | null;
  setCurrentGarment(g: ClothingItem | null): void;
  dispose(): void;                                          // revokes blob URLs
}

interface ClothingItem {
  id: string; name: string; category: ClothingCategory;
  imageUrl: string;               // preview
  texture: HTMLCanvasElement;     // processed, background-removed
  width: number; height: number;
  anchors: ClothingAnchorPoints;  // shoulders, sleeve tips/bottoms, hem (px)
  backgroundRemoved: boolean;
}

interface ClothingWarp {
  triangles: MeshTriangle[];      // source (texture px) → target (frame px)
  center: Point;
}
```

Load pipeline: validate → downscale to `MAX_IMAGE_SIZE` → background removal
(± worker offload) → alpha mask → category → anchors. Warp pipeline: torso
mesh re-projection + sleeve chains (see ARCHITECTURE.md).

## `OcclusionEngine` — `src/occlusion/OcclusionEngine.ts`

```ts
class OcclusionEngine {
  constructor(enabled?: boolean);
  computeOccluders(pose: Pose, frameW: number, frameH: number): OcclusionResult | null;
  isPointOccluded(result: OcclusionResult, x: number, y: number): boolean; // tests/debug
  setEnabled(v: boolean): void;
  reset(): void;                  // clears Kalman state on garment/person change
}
```

Capsules are emitted only when the arm's filtered z is in front of the torso
plane (`OCCLUSION.FRONT_Z_THRESHOLD`).

## `Renderer` — `src/rendering/Renderer.ts`

```ts
class Renderer {
  constructor(options: { canvas: HTMLCanvasElement; mirrored: boolean; debug: boolean });
  resize(w: number, h: number): void;
  setMirrored(v: boolean): void;
  setDebug(v: boolean): void;
  render(frame: {
    video: HTMLVideoElement | null;
    garment: ClothingItem | null;
    warp: ClothingWarp | null;
    pose: Pose | null;
    segmentation: SegmentationResult | null;
    occlusion: OcclusionResult | null;
    poseInferenceMs?: number;
    segmentationInferenceMs?: number;
    inferenceFps?: number;
  }): void;
  getMetrics(): PerformanceMetrics;
  captureDataURL(): string | null;
}
```

## Sample garment catalog — `src/services/garmentCatalog.ts`

`GARMENT_CATALOG: GarmentCatalogEntry[]` and `FULL_PRODUCT_CATALOG: Product[]`. Pure data. Includes utilities for `getProductById`, `getProductsByCategory`, and `searchProducts`.

## `VirtualTryOnService` — `src/services/virtualTryOnService.ts`

Asynchronous job orchestrator for photo virtual try-on matching Section 7:

```ts
class VirtualTryOnService {
  static validateInputs(personImage: string, garmentImage: string): { valid: boolean; error?: string };
  static async generateTryOn(request: TryOnRequest): Promise<TryOnJob>;
  static async getJobStatus(jobId: string): Promise<TryOnJob>;
  static async retrieveResult(jobId: string): Promise<TryOnResult>;
  static async cancelJob(jobId: string): Promise<boolean>;
}
```

## `ProductExtractor` — `src/services/productExtractor.ts`

SSRF-safe URL validation and metadata extraction:

```ts
function validateProductUrl(url: string): { valid: boolean; error?: string };
function inferCategoryFromText(text: string): ClothingCategory;
async function extractProductFromUrl(url: string): Promise<ExtractedProduct>;
```

## `StorageService` — `src/services/storageService.ts`

Local persistence and privacy compliance:

```ts
class StorageService {
  static getSavedLooks(): SavedLook[];
  static saveLook(look: Omit<SavedLook, 'id' | 'createdAt'>): SavedLook;
  static deleteLook(lookId: string): boolean;
  static toggleFavoriteLook(lookId: string): boolean;
  static getFavoriteProductIds(): string[];
  static toggleFavoriteProduct(productId: string): boolean;
  static getPreferences(): UserPreferences;
  static updatePreferences(patch: Partial<UserPreferences>): UserPreferences;
  static exportAllData(): string; // GDPR compliant JSON export
  static clearAllData(): void;    // Purges all local storage
}
```

---

# Backend Microservice API (`backend/main.py`)

FastAPI REST endpoints for product extraction and async try-on jobs.

### `GET /api/health`
Returns service status, version, and supported capabilities.

### `POST /api/products/extract`
Validates submitted shopping URL against SSRF and extracts metadata.
- **Request Body**: `{"url": "https://www.myntra.com/..."}`
- **Security**: Blocks localhost, loopbacks, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and cloud metadata (`169.254.169.254`).
- **Response**: `UrlExtractResponse` (`title`, `brand`, `price`, `currency`, `images`, `selected_image_url`, `category`, `retailer`)

### `POST /api/tryon/jobs`
Submits an asynchronous virtual try-on inference job.
- **Request Body**: `{"person_image": "...", "garment_image": "...", "garment_name": "...", "category": "shirt", "model_name": "client-high-res"}`
- **Response**: `TryOnJobResponse` (`job_id`, `status`, `progress`, timestamps)

### `GET /api/tryon/jobs/{job_id}`
Retrieves status and output URL for a previously submitted job.

### `DELETE /api/tryon/jobs/{job_id}`
Cancels an active job.

