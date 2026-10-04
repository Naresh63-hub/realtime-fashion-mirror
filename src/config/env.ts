/**
 * Environment variable loading and validation.
 * All `VITE_*` vars are strings; this module parses them once with safe
 * fallbacks so no other module ever touches `import.meta.env` directly.
 */

function str(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function num(name: string, fallback: number, min: number, max: number): number {
  const raw = import.meta.env[name];
  const parsed = typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function bool(name: string, fallback: boolean): boolean {
  const raw = import.meta.env[name];
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}

/**
 * Base URL that hosts the MediaPipe wasm runtime and task models.
 * Defaults to local self-hosted copies under `/mediapipe/`; point
 * `VITE_MEDIAPIPE_CDN` at a CDN mirror for local prototyping without
 * downloading models.
 */
export const ENV = {
  /** Base path for wasm + model files (no trailing slash). */
  MEDIAPIPE_BASE_URL: str('VITE_MEDIAPIPE_CDN', '/mediapipe'),
  /**
   * Pose model file name inside MEDIAPIPE_BASE_URL (float16 pose_landmarker).
   * The full float32 model yields better tracking; float16 halves download.
   */
  POSE_MODEL_FILE: str('VITE_POSE_MODEL_FILE', 'pose_landmarker_lite.task'),
  /** Segmentation model file name (selfie segmenter, square 256x256). */
  SEGMENTATION_MODEL_FILE: str(
    'VITE_SEGMENTATION_MODEL_FILE',
    'selfie_segmenter.tflite'
  ),

  CAMERA_WIDTH: num('VITE_CAMERA_WIDTH', 1280, 320, 1920),
  CAMERA_HEIGHT: num('VITE_CAMERA_HEIGHT', 720, 240, 1080),
  TARGET_FPS: num('VITE_TARGET_FPS', 30, 5, 60),

  POSE_DELEGATE_GPU: bool('VITE_POSE_DELEGATE_GPU', true),
  POSE_MIN_DETECTION_CONFIDENCE: num('VITE_POSE_MIN_DETECTION_CONFIDENCE', 0.5, 0, 1),
  POSE_MIN_TRACKING_CONFIDENCE: num('VITE_POSE_MIN_TRACKING_CONFIDENCE', 0.5, 0, 1),
  POSE_MIN_PRESENCE_CONFIDENCE: num('VITE_POSE_MIN_PRESENCE_CONFIDENCE', 0.5, 0, 1),

  SEGMENTATION_DELEGATE_GPU: bool('VITE_SEGMENTATION_DELEGATE_GPU', true),

  TRACKING_SMOOTHING_FACTOR: num('VITE_TRACKING_SMOOTHING_FACTOR', 0.35, 0, 1),
  /** Torso landmark mean-visibility required to accept a pose. */
  TRACKING_CONFIDENCE: num('VITE_TRACKING_CONFIDENCE', 0.55, 0, 1),
  MAX_FRAMES_TO_SKIP: num('VITE_MAX_FRAMES_TO_SKIP', 5, 0, 30),

  ENABLE_DEBUG_MODE: bool('VITE_ENABLE_DEBUG_MODE', false),
  SHOW_LANDMARKS: bool('VITE_SHOW_LANDMARKS', false),
  SHOW_MASK: bool('VITE_SHOW_MASK', false),
  SHOW_PERFORMANCE: bool('VITE_SHOW_PERFORMANCE', false),

  ENABLE_SEGMENTATION: bool('VITE_ENABLE_SEGMENTATION', true),
  ENABLE_OCCLUSION: bool('VITE_ENABLE_OCCLUSION', true),
  ENABLE_BACKGROUND_REMOVAL: bool('VITE_ENABLE_BACKGROUND_REMOVAL', true),

  /** Upload constraints (privacy + safety). */
  MAX_UPLOAD_BYTES: num('VITE_MAX_UPLOAD_BYTES', 8 * 1024 * 1024, 1024, 64 * 1024 * 1024),

  ENABLE_WRINKLES: bool('VITE_ENABLE_WRINKLES', true),
  WRINKLE_INTENSITY: num('VITE_WRINKLE_INTENSITY', 0.6, 0, 1),
  WEBGPU_PREFERRED: bool('VITE_WEBGPU_PREFERRED', true),
  USE_WORKER: bool('VITE_USE_WORKER', true),

  FIT_BUST_DEFAULT: num('VITE_FIT_BUST_DEFAULT', 0.5, 0, 1),
  FIT_WAIST_DEFAULT: num('VITE_FIT_WAIST_DEFAULT', 0.5, 0, 1),
  FIT_HIP_DEFAULT: num('VITE_FIT_HIP_DEFAULT', 0.5, 0, 1),
  FIT_HEIGHT_DEFAULT: num('VITE_FIT_HEIGHT_DEFAULT', 0.5, 0, 1),

  // --- Warp realism (3D perspective, anisotropic sleeves, body-shape fit) ---
  /** Apply depth-aware foreshortening from landmark z (default: true). */
  ENABLE_PERSPECTIVE: bool('VITE_ENABLE_PERSPECTIVE', true),
  /** How strongly near/far torso sides scale. 0 = off, higher = more. */
  PERSPECTIVE_STRENGTH: num('VITE_PERSPECTIVE_STRENGTH', 1.0, 0, 3),
  /** Below this torso z-spread the perspective pass is skipped (anti-jitter). */
  PERSPECTIVE_MIN_Z_VARIANCE: num('VITE_PERSPECTIVE_MIN_Z_VARIANCE', 0.03, 0, 0.5),
  /** Stretch sleeve fabric anisotropically with elbow bend (default: true). */
  ENABLE_ANISOTROPY: bool('VITE_ENABLE_ANISOTROPY', true),
  /** Reported anisotropy per radian of elbow bend. */
  ANISOTROPY_GAIN: num('VITE_ANISOTROPY_GAIN', 0.9, 0, 3),
  /** Max fraction of the reported anisotropy actually baked into the texture. */
  ANISOTROPY_APPLIED: num('VITE_ANISOTROPY_APPLIED', 0.25, 0, 1),
  /** Beltline width delta at a full slider extreme (±). */
  FIT_WIDTH_RANGE: num('VITE_FIT_WIDTH_RANGE', 0.55, 0, 1),
  /** Torso-length delta at a full height-slider extreme (±). */
  FIT_HEIGHT_RANGE: num('VITE_FIT_HEIGHT_RANGE', 0.42, 0, 1),

  AUTH_SESSION_DAYS: num('VITE_AUTH_SESSION_DAYS', 7, 1, 365),
  COMMERCE_CURRENCY: str('VITE_COMMERCE_CURRENCY', 'INR'),
  MAX_RECORD_SECONDS: num('VITE_MAX_RECORD_SECONDS', 30, 1, 600),
  PHYSICS_ENABLED: bool('VITE_PHYSICS_ENABLED', false),
} as const;
