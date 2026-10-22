/**
 * Central type definitions.
 *
 * Technology note: these types describe *results* of the CV pipeline in a
 * library-agnostic way. Concrete engines (MediaPipe tasks-vision today)
 * adapt their native output into these shapes so the rest of the app never
 * depends on a specific inference library.
 */

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export type FacingMode = 'user' | 'environment';

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: FacingMode;
  frameRate: number;
  deviceId?: string;
}

export type CameraErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'IN_USE'
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

// ---------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------

/** A single 2D body landmark in normalized [0..1] frame coordinates. */
export interface BodyLandmark {
  x: number;
  y: number;
  /** Relative depth; smaller = closer to camera. Same scale as x. */
  z: number;
  /** Likelihood [0..1] that the landmark is visible in frame. */
  visibility: number;
}

/** Index map for the 33-point MediaPipe Pose topology. */
export const LandmarkIndex = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type LandmarkKey = keyof typeof LandmarkIndex;

/** A detected person with 33 landmarks, tracking state and derived torso info. */
export interface Pose {
  landmarks: BodyLandmark[];
  /** Millisecond timestamp of the source video frame. */
  timestamp: number;
  /** Mean visibility of the torso-critical landmarks [0..1]. */
  confidence: number;
  /** True while the tracker has a continuous lock (used for coasting). */
  isCoasted: boolean;
}

// ---------------------------------------------------------------------------
// Segmentation
// ---------------------------------------------------------------------------

/**
 * Single-channel person/background mask.
 * `data[i]` is 0..255 (255 = person) at `width` x `height` resolution.
 */
export interface SegmentationMask {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface SegmentationResult {
  mask: SegmentationMask;
  /** Ratio of foreground pixels [0..1], used as a sanity signal. */
  coverage: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Clothing
// ---------------------------------------------------------------------------

export enum ClothingCategory {
  T_SHIRT = 't-shirt',
  SHIRT = 'shirt',
  JACKET = 'jacket',
  TOP = 'top',
  KURTI = 'kurti',
  DRESS = 'dress',
  UNKNOWN = 'unknown',
}

export interface ClothingShapeAdjustments {
  bust: number;
  waist: number;
  hip: number;
  height: number;
}

export interface WrinkleConfig {
  enabled: boolean;
  intensity: number;
  animated: boolean;
}

export interface FitPreset {
  id: string;
  name: string;
  adjustments: ClothingShapeAdjustments;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Anchor points in clothing-image pixel coordinates.
 * Sleeves are optional (sleeveless tops lack them). Sleeve bottoms bound
 * the vertical extent of each sleeve for the warp stage.
 */
export interface ClothingAnchorPoints {
  leftShoulder: Point;
  rightShoulder: Point;
  leftSleeve?: Point;
  rightSleeve?: Point;
  leftSleeveBottom?: Point;
  rightSleeveBottom?: Point;
  bottom: Point;
}

/** Processed garment ready for body-anchored rendering. */
export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  /** Original (possibly transparent) URL used for previews. */
  imageUrl: string;
  /** Processed texture with background removed; drawn via mesh warp. */
  texture: HTMLCanvasElement;
  width: number;
  height: number;
  anchors: ClothingAnchorPoints;
  /** Whether an automated background-removal pass ran. */
  backgroundRemoved: boolean;
}

/**
 * A warpable triangle over the clothing texture.
 * All coordinates are in clothing-texture pixel space.
 */
export interface MeshTriangle {
  /** Source triangle in texture coordinates. */
  source: [Point, Point, Point];
  /** Destination triangle in canvas (frame) coordinates. */
  target: [Point, Point, Point];
  anisotropy?: number;
}

/**
 * Deformation result: the garment mesh mapped onto the current body.
 * Produced by the ClothingEngine, consumed by the Renderer.
 */
export interface ClothingWarp {
  triangles: MeshTriangle[];
  /** Rough center in frame coordinates (for debug overlays). */
  center: Point;
}

// ---------------------------------------------------------------------------
// Occlusion
// ---------------------------------------------------------------------------

/**
 * A capsule-shaped occluder (arm segment / hand / head) in frame pixels.
 * The renderer subtracts these from the clothing layer with `destination-out`.
 */
export interface OccluderCapsule {
  a: Point;
  b: Point;
  radius: number;
  /** Cap type of segment `a` (hands are circles, not round caps). */
  rounded: boolean;
}

export interface OcclusionResult {
  capsules: OccluderCapsule[];
  timestamp: number;
}

export interface LayeredGarmentFrame {
  garment: ClothingItem;
  warp: ClothingWarp;
  occlusion: OcclusionResult;
}

// ---------------------------------------------------------------------------
// Auth / User
// ---------------------------------------------------------------------------

export interface AuthSession {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
}

export interface LocalUser {
  id: string;
  email: string;
  saltHex: string;
  hashHex: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Commerce / Catalog
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ClothingCategory;
  priceINR: number;
  description: string;
  imageUrl: string;
  swatch: string;
  brand?: string;
  retailerUrl?: string;
  images?: string[];
  colors?: { name: string; hex: string; imageUrl?: string }[];
  sizes?: string[];
  rating?: number;
  inStock?: boolean;
  details?: string[];
}

export interface ExtractedProduct {
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  images: string[];
  selectedImageUrl: string;
  originalUrl: string;
  category: ClothingCategory;
  retailer: string;
  description?: string;
  sizes?: string[];
}

export type TryOnJobStatus = 'idle' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface TryOnJob {
  id: string;
  status: TryOnJobStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  personImageUrl: string;
  garmentImageUrl: string;
  garmentName: string;
  garmentCategory: ClothingCategory;
  resultImageUrl?: string;
  error?: string;
  modelName: string;
}

export interface TryOnResult {
  jobId: string;
  personImageUrl: string;
  resultImageUrl: string;
  canvasImageUrl?: string;
  aiImageUrl?: string;
  garmentImageUrl: string;
  garmentName: string;
  garmentCategory: ClothingCategory;
  timestamp: number;
  modelUsed: string;
  confidence?: number;
}

export interface LiveSessionInfo {
  sessionId: string;
  status: string;
  createdAt: number;
  maxInactivitySeconds: number;
  guidance: string;
}

export interface LiveFrameResponse {
  sessionId: string;
  status: 'processed' | 'busy' | 'unconfigured' | 'failed';
  dropped: boolean;
  message: string;
  resultImageUrl?: string;
  canFallbackToCanvas: boolean;
}

export interface LiveSessionStatus {
  sessionId: string;
  status: string;
  isProcessing: boolean;
  activeJobId?: string;
  jobProgress: number;
  latestResultUrl?: string;
  framesReceived: number;
  framesDropped: number;
  aiConfigured: boolean;
}


export interface SavedLook {
  id: string;
  title: string;
  personImageUrl: string;
  resultImageUrl: string;
  garmentId: string;
  garmentName: string;
  garmentCategory: ClothingCategory;
  garmentImageUrl: string;
  priceINR?: number;
  createdAt: number;
  isFavorite: boolean;
  notes?: string;
  tags?: string[];
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  cameraResolution: '720p' | '1080p';
  preferredFacingMode: FacingMode;
  mirrorUserCamera: boolean;
  smoothingFactor: number;
  confidenceThreshold: number;
  showLandmarksByDefault: boolean;
  inferenceMode: 'client-high-res' | 'cloud-genai';
  cloudVtonApiUrl?: string;
  storagePreference: 'local' | 'session-only';
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  totalTryOns: number;
  memberSince: number;
}

export interface CartLineItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceINR: number;
  qty: number;
  imageUrl: string;
}

export interface Outfit {
  id: string;
  name: string;
  thumbnailDataUrl?: string;
  garmentIds: string[];
  garmentUrls?: { url: string; name: string }[];
  shapeAdjustments: ClothingShapeAdjustments;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Provider interfaces
// ---------------------------------------------------------------------------

export interface CatalogProvider {
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  search(query: string): Promise<Product[]>;
}

export interface AuthProvider {
  register(email: string, password: string): Promise<AuthSession>;
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  me(): Promise<AuthSession | null>;
}

export interface ARProvider {
  isSupported(): boolean;
  start(video: HTMLVideoElement): Promise<void>;
  stop(): void;
}

export interface ClothPhysicsProvider {
  reset(width: number, height: number): void;
  attachLandmarks(pose: Pose): void;
  step(dtMs: number): { particles: { x: number; y: number }[] };
  getParticlePositions(): { x: number; y: number }[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export enum ErrorType {
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  CAMERA_IN_USE = 'CAMERA_IN_USE',
  INSECURE_CONTEXT = 'INSECURE_CONTEXT',
  NO_PERSON_DETECTED = 'NO_PERSON_DETECTED',
  MULTIPLE_PEOPLE_DETECTED = 'MULTIPLE_PEOPLE_DETECTED',
  POOR_TRACKING = 'POOR_TRACKING',
  PERSON_OUT_OF_FRAME = 'PERSON_OUT_OF_FRAME',
  CLOTHING_IMAGE_INVALID = 'CLOTHING_IMAGE_INVALID',
  CLOTHING_UNSUPPORTED_TYPE = 'CLOTHING_UNSUPPORTED_TYPE',
  MODEL_LOADING_FAILED = 'MODEL_LOADING_FAILED',
  MODEL_NOT_READY = 'MODEL_NOT_READY',
  RENDER_FAILURE = 'RENDER_FAILURE',
  UNKNOWN = 'UNKNOWN',
  AR_NOT_SUPPORTED = 'AR_NOT_SUPPORTED',
  AUTH_EMAIL_IN_USE = 'AUTH_EMAIL_IN_USE',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  RECORDING_FAILED = 'RECORDING_FAILED',
}

export interface AppError {
  type: ErrorType;
  /** User-facing message; safe to display, no stack traces. */
  message: string;
  details?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Performance / debug
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  /** Rolling render fps. */
  fps: number;
  /** Per-frame total pipeline duration in ms (smoothed). */
  frameTimeMs: number;
  /** Pose inference duration in ms (smoothed). */
  poseInferenceMs: number;
  /** Segmentation inference duration in ms (smoothed). */
  segmentationInferenceMs: number;
  /** Detection cadence: pose frames per second (may be lower than fps). */
  inferenceFps: number;
  /** JS heap usage in MB when `performance.memory` is available. */
  heapMb?: number;
  /** Age of the frame at inference time in ms. */
  frameAgeMs?: number;
  /** Number of stale frames dropped to preserve real-time latency. */
  droppedFrames?: number;
  /** Battery / thermal summary if navigator.getBattery is available. */
  batteryInfo?: string;
}

export type TrackingStatus = 'idle' | 'searching' | 'tracking' | 'coasting' | 'lost';

// ---------------------------------------------------------------------------
// Application state (UI-facing snapshot)
// ---------------------------------------------------------------------------

export interface TryOnStatus {
  engineReady: boolean;
  cameraActive: boolean;
  tracking: TrackingStatus;
  poseConfidence: number;
  peopleCount: number;
  garment: { id: string; name: string; category: ClothingCategory; imageUrl: string } | null;
  metrics: PerformanceMetrics;
  error: AppError | null;
}
