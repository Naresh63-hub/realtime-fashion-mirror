import type { ClothingShapeAdjustments } from '../types';
import { ENV } from './env';

/**
 * Central runtime configuration. Values derive from parsed environment
 * variables; nothing in the app hard-codes tunables outside this file.
 */

export const APP_CONFIG = {
  CAMERA: {
    DEFAULT_WIDTH: ENV.CAMERA_WIDTH,
    DEFAULT_HEIGHT: ENV.CAMERA_HEIGHT,
    TARGET_FPS: ENV.TARGET_FPS,
    MIN_FPS: 15,
    MAX_FPS: 60,
  },

  POSE: {
    USE_GPU: ENV.POSE_DELEGATE_GPU,
    MIN_DETECTION_CONFIDENCE: ENV.POSE_MIN_DETECTION_CONFIDENCE,
    MIN_TRACKING_CONFIDENCE: ENV.POSE_MIN_TRACKING_CONFIDENCE,
    MIN_PRESENCE_CONFIDENCE: ENV.POSE_MIN_PRESENCE_CONFIDENCE,
    /** Max poses tracked; try-on is single-person by design. */
    NUM_POSES: 1,
    /** Late frames (> this many ms old) are skipped to avoid lag. */
    MAX_FRAME_AGE_MS: 100,
  },

  SEGMENTATION: {
    USE_GPU: ENV.SEGMENTATION_DELEGATE_GPU,
    ENABLED: ENV.ENABLE_SEGMENTATION,
  },

  TRACKING: {
    SMOOTHING_FACTOR: ENV.TRACKING_SMOOTHING_FACTOR,
    TRACKING_CONFIDENCE: ENV.TRACKING_CONFIDENCE,
    MIN_DETECTION_CONFIDENCE: ENV.POSE_MIN_DETECTION_CONFIDENCE,
    MAX_FRAMES_TO_SKIP: ENV.MAX_FRAMES_TO_SKIP,
    /** How long (ms) a lost pose may be coasted before "lost". */
    COAST_TIMEOUT_MS: 600,
  },

  RENDERING: {
    ENABLE_DEBUG_MODE: ENV.ENABLE_DEBUG_MODE,
    SHOW_LANDMARKS: ENV.SHOW_LANDMARKS,
    SHOW_MASK: ENV.SHOW_MASK,
    SHOW_PERFORMANCE: ENV.SHOW_PERFORMANCE,
    /** Garment mesh resolution (subdivisions across the torso). */
    MESH_COLS: 8,
    MESH_ROWS: 8,
    ENABLE_WRINKLES: ENV.ENABLE_WRINKLES,
    WRINKLE_INTENSITY: ENV.WRINKLE_INTENSITY,
    WEBGPU_PREFERRED: ENV.WEBGPU_PREFERRED,
  },

  PERFORMANCE: {
    TARGET_LATENCY_MS: Math.round(1000 / ENV.TARGET_FPS),
    /** If a frame exceeds this, the loop drops into a slower cadence. */
    MAX_LATENCY_MS: 100,
    /** Consecutive slow frames before cadence reduces (adaptive throttling). */
    SLOW_FRAME_STREAK_LIMIT: 3,
    /** UI status sync interval — keeps React out of the render loop. */
    UI_SYNC_INTERVAL_MS: 250,
    USE_WORKER: ENV.USE_WORKER,
  },

  FIT: {
    DEFAULTS: {
      bust: ENV.FIT_BUST_DEFAULT,
      waist: ENV.FIT_WAIST_DEFAULT,
      hip: ENV.FIT_HIP_DEFAULT,
      height: ENV.FIT_HEIGHT_DEFAULT,
    } satisfies ClothingShapeAdjustments,
    /** Beltline width delta at a full slider extreme (±). */
    WIDTH_RANGE: ENV.FIT_WIDTH_RANGE,
    /** Torso-length delta at a full height-slider extreme (±). */
    HEIGHT_RANGE: ENV.FIT_HEIGHT_RANGE,
  },

  // Depth-aware warping + anisotropic fabric — geometric realism applied
  // inside ClothingEngine.calculateWarp. All sub-features degrade to a no-op
  // when pose z-data is unreliable (see MIN_Z_VARIANCE) so tracking stays
  // stable. Technology: deterministic geometry, no learned parameters.
  WARP: {
    ENABLE_PERSPECTIVE: ENV.ENABLE_PERSPECTIVE,
    PERSPECTIVE_STRENGTH: ENV.PERSPECTIVE_STRENGTH,
    PERSPECTIVE_MIN_Z_VARIANCE: ENV.PERSPECTIVE_MIN_Z_VARIANCE,
    ENABLE_ANISOTROPY: ENV.ENABLE_ANISOTROPY,
    ANISOTROPY_GAIN: ENV.ANISOTROPY_GAIN,
    ANISOTROPY_APPLIED: ENV.ANISOTROPY_APPLIED,
  },

  AUTH: {
    SESSION_DAYS: ENV.AUTH_SESSION_DAYS,
  },

  COMMERCE: {
    CURRENCY: ENV.COMMERCE_CURRENCY,
  },

  SHARE: {
    MAX_RECORD_SECONDS: ENV.MAX_RECORD_SECONDS,
  },

  PHYSICS: {
    ENABLED: ENV.PHYSICS_ENABLED,
  },

  CLOTHING: {
    MAX_IMAGE_SIZE: 2048,
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as readonly string[],
    /** Upload size limit (bytes). */
    MAX_UPLOAD_BYTES: ENV.MAX_UPLOAD_BYTES,
    AUTO_BACKGROUND_REMOVAL: ENV.ENABLE_BACKGROUND_REMOVAL,
    /** Pure-color (background) detection threshold for white/gray backdrops. */
    BG_LUMA_THRESHOLD: 235,
    /** Sample spacing (px) for flood-fill background pass. */
    BG_SAMPLE_STEP: 1,
    /** Tolerance for flood-fill background color similarity. */
    BG_TOLERANCE: 28,
    /** Mesh subdivision used for body-warped rendering. */
    MESH_COLS: 8,
    MESH_ROWS: 8,
    /** Anchor "grab" radius as a fraction of garment width. */
    ANCHOR_SEARCH_RADIUS: 0.18,
  },

  OCCLUSION: {
    ENABLED: ENV.ENABLE_OCCLUSION,
    /** Forearm radius as a fraction of shoulder-hip distance. */
    ARM_RADIUS_RATIO: 0.085,
    /** Hand radius as a fraction of shoulder-hip distance. */
    HAND_RADIUS_RATIO: 0.07,
    /** Head radius as a fraction of shoulder-hip distance. */
    HEAD_RADIUS_RATIO: 0.14,
    /** Wrist z below this means "arm in front of torso" → occlude. */
    FRONT_Z_THRESHOLD: -0.02,
    /** Head always occludes the neckline area above shoulders. */
    HEAD_OCCLUSION_ENABLED: true,
  },

  UI: {
    DEBOUNCE_DELAY: 300,
    LOADING_TIMEOUT: 20000,
  },
  API: {
    BASE_URL: ENV.API_URL,
  },
} as const;

export const CLOTHING_DEFAULTS: Record<
  string,
  {
    leftShoulder: { x: number; y: number };
    rightShoulder: { x: number; y: number };
    leftSleeve?: { x: number; y: number };
    rightSleeve?: { x: number; y: number };
    bottom: { x: number; y: number };
  }
> = {
  't-shirt': {
    leftShoulder: { x: 0.2, y: 0.1 },
    rightShoulder: { x: 0.8, y: 0.1 },
    leftSleeve: { x: 0.1, y: 0.2 },
    rightSleeve: { x: 0.9, y: 0.2 },
    bottom: { x: 0.5, y: 0.9 },
  },
  shirt: {
    leftShoulder: { x: 0.2, y: 0.1 },
    rightShoulder: { x: 0.8, y: 0.1 },
    leftSleeve: { x: 0.05, y: 0.2 },
    rightSleeve: { x: 0.95, y: 0.2 },
    bottom: { x: 0.5, y: 0.95 },
  },
  jacket: {
    leftShoulder: { x: 0.2, y: 0.1 },
    rightShoulder: { x: 0.8, y: 0.1 },
    leftSleeve: { x: 0.05, y: 0.2 },
    rightSleeve: { x: 0.95, y: 0.2 },
    bottom: { x: 0.5, y: 0.95 },
  },
  top: {
    leftShoulder: { x: 0.2, y: 0.1 },
    rightShoulder: { x: 0.8, y: 0.1 },
    bottom: { x: 0.5, y: 0.85 },
  },
  kurti: {
    leftShoulder: { x: 0.2, y: 0.05 },
    rightShoulder: { x: 0.8, y: 0.05 },
    bottom: { x: 0.5, y: 0.95 },
  },
};
