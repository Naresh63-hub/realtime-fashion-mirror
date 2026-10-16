/**
 * useVirtualTryOn — application-layer orchestrator between UI and the CV
 * pipeline. The UI contains no computer-vision logic; this hook owns it.
 *
 * Loop design (single rAF, no React re-renders per frame):
 *
 *   rAF tick
 *     ├─ adaptive cadence gate (target FPS / slow-frame backoff)
 *     ├─ PoseDetector.detectForVideo(video, ts)        [ML, GPU delegate]
 *     ├─ landmark smoothing + coasting (bridges short dropouts)
 *     ├─ ClothingEngine.calculateWarp(pose, garment)   [geometry]
 *     ├─ OcclusionEngine.computeOccluders(pose)        [geometry + z]
 *     ├─ SegmentationEngine.segmentForVideo(...)       [ML, debug only]
 *     └─ Renderer.render(...)                          [GPU canvas]
 *
 * React state is synced from the pipeline at UI_SYNC_INTERVAL_MS; nothing
 * in the frame loop allocates per-frame objects or touches React.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppError,
  ClothingItem,
  ClothingWarp,
  OcclusionResult,
  Pose,
  SegmentationResult,
  TrackingStatus,
  TryOnStatus,
  BodyLandmark,
} from '../types';
import { ErrorType } from '../types';
import type { ClothPhysicsProvider } from '../physics/ClothPhysicsProvider';
import { NoopClothPhysicsProvider } from '../physics/NoopClothPhysicsProvider';
import { CameraManager, CameraError } from '../camera/CameraManager';
import { PoseDetector } from '../pose/PoseDetector';
import { smoothLandmarks } from '../pose/poseGeometry';
import { SegmentationEngine } from '../segmentation/SegmentationEngine';
import { ClothingEngine } from '../clothing/ClothingEngine';
import { OcclusionEngine } from '../occlusion/OcclusionEngine';
import { Renderer } from '../rendering/Renderer';
import { APP_CONFIG } from '../config';
import { StorageService } from '../services/storageService';
import { logger } from '../utils/logger';

interface PipelineRefs {
  camera: CameraManager;
  pose: PoseDetector;
  segmentation: SegmentationEngine;
  clothing: ClothingEngine;
  occlusion: OcclusionEngine;
  renderer: Renderer | null;
  physics: ClothPhysicsProvider;
}

const COAST_TIMEOUT_MS = APP_CONFIG.TRACKING.COAST_TIMEOUT_MS;

/**
 * Pure helper that runs the cloth physics hook block when enabled.
 * Extracted from the frame loop so tests can exercise it without a full rAF.
 */
export function runPhysicsHook(
  refs: { physics: ClothPhysicsProvider },
  pose: Pose | null,
  now: number,
  physicsLastStepRef: { current: number }
): void {
  if (APP_CONFIG.PHYSICS.ENABLED && pose && !pose.isCoasted) {
    refs.physics.attachLandmarks(pose);
    const dt = now - (physicsLastStepRef.current || now);
    refs.physics.step(dt);
    physicsLastStepRef.current = now;
  }
}

export function useVirtualTryOn(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  // ---- UI-facing state (throttled) ------------------------------------
  const [engineReady, setEngineReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [tracking, setTracking] = useState<TrackingStatus>('idle');
  const [garment, setGarment] = useState<ClothingItem | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [debugMode, setDebugMode] = useState(APP_CONFIG.RENDERING.ENABLE_DEBUG_MODE);
  const [metrics, setMetrics] = useState<TryOnStatus['metrics']>({
    fps: 0,
    frameTimeMs: 0,
    poseInferenceMs: 0,
    segmentationInferenceMs: 0,
    inferenceFps: 0,
  });

  // ---- Engines (stable refs) ------------------------------------------
  const refs = useRef<PipelineRefs>({
    camera: new CameraManager(),
    pose: new PoseDetector(),
    segmentation: new SegmentationEngine(),
    clothing: new ClothingEngine(),
    occlusion: new OcclusionEngine(),
    renderer: null,
    physics: new NoopClothPhysicsProvider(),
  });

  // ---- Per-frame mutable state ----------------------------------------
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastTickRef = useRef(0);
  const lastInferenceRef = useRef(0);
  const slowStreakRef = useRef(0);
  const effectiveIntervalRef = useRef(1000 / APP_CONFIG.CAMERA.TARGET_FPS);
  const smoothedLandmarksRef = useRef<BodyLandmark[] | null>(null);
  const lastPoseRef = useRef<Pose | null>(null);
  const lastPoseTimeRef = useRef(0);
  const warpRef = useRef<ClothingWarp | null>(null);
  const occlusionRef = useRef<OcclusionResult | null>(null);
  const segmentationRef = useRef<SegmentationResult | null>(null);
  const garmentRef = useRef<ClothingItem | null>(null);
  const inferenceCountRef = useRef(0);
  const inferenceWindowRef = useRef(0);
  const inferenceFpsRef = useRef(0);
  const poseInferenceMsRef = useRef(0);
  const segmentationInferenceMsRef = useRef(0);
  const mirrorRef = useRef(true);
  const segDebugRef = useRef(APP_CONFIG.RENDERING.SHOW_MASK);
  const debugModeRef = useRef(APP_CONFIG.RENDERING.ENABLE_DEBUG_MODE);
  const physicsLastStepRef = useRef<number>(0);
  const batteryInfoRef = useRef<string | undefined>(undefined);

  // Monitor device battery if supported (for mobile/thermal diagnostics)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const update = () => {
          const level = Math.round(battery.level * 100);
          const charging = battery.charging ? ' (charging)' : '';
          batteryInfoRef.current = `Battery: ${level}%${charging}`;
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      }).catch(() => {});
    }
  }, []);

  // Keep the frame loop's garment reference in sync without re-rendering.
  useEffect(() => {
    garmentRef.current = garment;
  }, [garment]);

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const init = async (): Promise<void> => {
      try {
        await refs.current.pose.initialize();
        // Segmentation is only consumed by the debug mask view — load it on
        // demand (toggleDebug) instead of blocking startup on a second graph.
        if (!cancelled) {
          setEngineReady(true);
          setInitializing(false);
        }
      } catch (err) {
        logger.error('model init failed', err);
        if (!cancelled) {
          setInitializing(false);
          setError({
            type: ErrorType.MODEL_LOADING_FAILED,
            message: 'Vision models failed to load. Check your connection and reload.',
            timestamp: Date.now(),
          });
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------------
  const processFrame = useCallback(
    (timestamp: number) => {
      if (!runningRef.current) return;

      const pipeline = refs.current;
      const video = videoElRef.current;
      const renderer = pipeline.renderer;
      if (!video || !renderer) return;

      // Adaptive cadence: hold target FPS; back off when frames run slow.
      const elapsed = timestamp - lastTickRef.current;
      if (elapsed < effectiveIntervalRef.current) return;
      lastTickRef.current = timestamp;

      const frameStart = performance.now();

      // ---- Pose (ML inference) ----
      let pose: Pose | null = null;
      const sinceInference = timestamp - lastInferenceRef.current;
      const minInferenceInterval = effectiveIntervalRef.current;
      const frameCaptureTime = performance.now();
      if (sinceInference >= minInferenceInterval) {
        lastInferenceRef.current = timestamp;
        const t0 = performance.now();
        pose = pipeline.pose.detectForVideo(video, timestamp, frameCaptureTime);
        poseInferenceMsRef.current = performance.now() - t0;

        inferenceCountRef.current++;
        if (inferenceWindowRef.current === 0) {
          inferenceWindowRef.current = performance.now();
        }
        const windowElapsed = performance.now() - inferenceWindowRef.current;
        if (windowElapsed >= 1000) {
          inferenceFpsRef.current = Math.round((inferenceCountRef.current * 1000) / windowElapsed);
          inferenceCountRef.current = 0;
          inferenceWindowRef.current = performance.now();
        }
      }

      if (pose) {
        // Smoothing + plausibility gate (reads user preference with env fallback)
        const prefs = StorageService.getPreferences();
        const smoothing = prefs?.smoothingFactor ?? APP_CONFIG.TRACKING.SMOOTHING_FACTOR;
        const minConfidence = prefs?.confidenceThreshold ?? APP_CONFIG.TRACKING.TRACKING_CONFIDENCE;

        pose.landmarks = smoothLandmarks(
          smoothedLandmarksRef.current,
          pose.landmarks,
          smoothing
        );
        smoothedLandmarksRef.current = pose.landmarks;

        const confident = pose.confidence >= minConfidence;
        if (confident) {
          lastPoseRef.current = pose;
          lastPoseTimeRef.current = timestamp;
          runPhysicsHook(pipeline, pose, performance.now(), physicsLastStepRef);
        } else {
          pose = null; // treat low-confidence as no pose for warp purposes
        }
      }

      // ---- Coasting: bridge brief detection dropouts ----
      let coasted = false;
      if (!pose && lastPoseRef.current) {
        const sincePose = timestamp - lastPoseTimeRef.current;
        if (sincePose < COAST_TIMEOUT_MS) {
          pose = { ...lastPoseRef.current, isCoasted: true, timestamp };
          coasted = true;
        } else {
          lastPoseRef.current = null;
          smoothedLandmarksRef.current = null;
        }
      }

      // ---- Garment warp + occlusion (geometry only) ----
      const activeGarment = garmentRef.current;
      const frameWidth = video.videoWidth || APP_CONFIG.CAMERA.DEFAULT_WIDTH;
      const frameHeight = video.videoHeight || APP_CONFIG.CAMERA.DEFAULT_HEIGHT;

      if (renderer.getWidth() !== frameWidth || renderer.getHeight() !== frameHeight) {
        renderer.resize(frameWidth, frameHeight);
      }

      if (pose && activeGarment) {
        warpRef.current = pipeline.clothing.calculateWarp(
          pose,
          activeGarment,
          frameWidth,
          frameHeight
        );
        occlusionRef.current = pipeline.occlusion.computeOccluders(pose, frameWidth, frameHeight);
      } else if (!pose) {
        warpRef.current = null;
        occlusionRef.current = null;
      }

      // ---- Segmentation (ML; only when mask debug is on) ----
      if (
        APP_CONFIG.SEGMENTATION.ENABLED &&
        segDebugRef.current &&
        pipeline.segmentation.isReady()
      ) {
        const t0 = performance.now();
        segmentationRef.current = pipeline.segmentation.segmentForVideo(video, timestamp);
        segmentationInferenceMsRef.current = performance.now() - t0;
      } else {
        segmentationRef.current = null;
      }

      // ---- Render ----
      renderer.render({
        video,
        garment: warpRef.current ? activeGarment : null,
        warp: warpRef.current,
        pose: pose,
        segmentation: segmentationRef.current,
        occlusion: occlusionRef.current,
        poseInferenceMs: poseInferenceMsRef.current,
        segmentationInferenceMs: segmentationInferenceMsRef.current,
        inferenceFps: inferenceFpsRef.current,
        frameAgeMs: performance.now() - frameCaptureTime,
        droppedFrames: pipeline.pose.getDroppedFrames(),
        batteryInfo: batteryInfoRef.current,
      });

      // ---- Adaptive cadence bookkeeping ----
      const frameTime = performance.now() - frameStart;
      if (frameTime > APP_CONFIG.PERFORMANCE.MAX_LATENCY_MS) {
        slowStreakRef.current++;
        if (slowStreakRef.current >= APP_CONFIG.PERFORMANCE.SLOW_FRAME_STREAK_LIMIT) {
          // Drop to ~60% cadence to recover headroom.
          effectiveIntervalRef.current = Math.min(
            1000 / APP_CONFIG.CAMERA.MIN_FPS,
            effectiveIntervalRef.current * 1.25
          );
          slowStreakRef.current = 0;
        }
      } else if (frameTime < APP_CONFIG.PERFORMANCE.TARGET_LATENCY_MS) {
        slowStreakRef.current = 0;
        effectiveIntervalRef.current = Math.max(
          1000 / APP_CONFIG.CAMERA.MAX_FPS,
          effectiveIntervalRef.current * 0.95
        );
      }

      // Coast timeout expiry → clear stale overlays.
      if (coasted && timestamp - lastPoseTimeRef.current >= COAST_TIMEOUT_MS) {
        warpRef.current = null;
        occlusionRef.current = null;
      }
    },
    []
  );

  const startLoop = useCallback(() => {
    if (rafIdRef.current !== null) return;
    runningRef.current = true;
    const loop = (ts: number): void => {
      if (!runningRef.current) return;
      processFrame(ts);
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  }, [processFrame]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Camera controls
  // ------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (!refs.current.pose.isReady()) {
      setError({
        type: ErrorType.MODEL_NOT_READY,
        message: 'Engine is still starting. Please try again in a moment.',
        timestamp: Date.now(),
      });
      return;
    }

    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.muted = true;

    try {
      setError(null);
      const prefs = StorageService.getPreferences();
      const resolutionMap: Record<string, { width: number; height: number }> = {
        '480p': { width: 640, height: 480 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
      };
      const targetRes = resolutionMap[prefs.cameraResolution] || { width: 1280, height: 720 };
      refs.current.camera.setConfig({
        width: targetRes.width,
        height: targetRes.height,
        facingMode: prefs.preferredFacingMode || 'user',
      });

      await refs.current.camera.start(video);
      videoElRef.current = video;

      const facingUser = refs.current.camera.getFacingMode() === 'user';
      const shouldMirror = prefs.mirrorUserCamera ? facingUser : false;
      mirrorRef.current = shouldMirror;
      rendererRefSetMirrored(refs.current.renderer, shouldMirror);

      setCameraActive(true);
      startLoop();
    } catch (err) {
      const appErr = mapCameraError(err);
      setError(appErr);
    }
  }, [startLoop]);

  const stopCamera = useCallback(() => {
    stopLoop();
    refs.current.camera.stop();
    videoElRef.current = null;
    smoothedLandmarksRef.current = null;
    lastPoseRef.current = null;
    warpRef.current = null;
    occlusionRef.current = null;
    setCameraActive(false);
    setTracking('idle');
  }, [stopLoop]);

  const switchCamera = useCallback(async () => {
    if (!refs.current.camera.isActive()) return;
    try {
      stopLoop();
      await refs.current.camera.switchCamera();
      const facingUser = refs.current.camera.getFacingMode() === 'user';
      mirrorRef.current = facingUser;
      rendererRefSetMirrored(refs.current.renderer, facingUser);
      startLoop();
    } catch (err) {
      setError(mapCameraError(err));
    }
  }, [startLoop, stopLoop]);

  // ------------------------------------------------------------------
  // Renderer lifecycle (canvas mount)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new Renderer({
      canvas,
      mirrored: mirrorRef.current,
      debug: debugMode,
    });
    refs.current.renderer = renderer;
    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        renderer.resize(Math.round(rect.width), Math.round(rect.height));
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const rendererRef = refs.current;
    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.renderer = null;
    };
  }, [canvasRef, debugMode]);

  // ------------------------------------------------------------------
  // Garment management
  // ------------------------------------------------------------------
  const loadGarmentFile = useCallback(async (file: File) => {
    try {
      setError(null);
      const item = await refs.current.clothing.loadFromFile(file);
      setGarment(item);
      refs.current.occlusion.reset();
    } catch (err) {
      logger.error('garment load failed', err);
      setError({
        type: ErrorType.CLOTHING_IMAGE_INVALID,
        message: 'That image could not be used. Try a clear product photo (PNG/JPEG).',
        timestamp: Date.now(),
      });
    }
  }, []);

  const loadGarmentUrl = useCallback(async (url: string, name: string, id?: string) => {
    try {
      setError(null);
      const item = await refs.current.clothing.loadFromUrl(url, name);
      // Catalog loads keep their catalog id so UI selection state round-trips;
      // engine-generated ids are only a fallback for callers that omit one.
      setGarment(id ? { ...item, id } : item);
      refs.current.occlusion.reset();
    } catch (err) {
      logger.error('garment url load failed', err);
      setError({
        type: ErrorType.CLOTHING_IMAGE_INVALID,
        message: 'That product image could not be loaded.',
        timestamp: Date.now(),
      });
    }
  }, []);

  const removeGarment = useCallback(() => {
    setGarment(null);
    warpRef.current = null;
    occlusionRef.current = null;
  }, []);

  const toggleDebug = useCallback(() => {
    setDebugMode((prev) => !prev);
    const next = !debugModeRef.current;
    debugModeRef.current = next;
    refs.current.renderer?.setDebug(next);
    // Mask visibility is owned by setMaskVisible (and the SHOW_MASK env
    // default); toggling the overlay must not override the user's choice.
  }, []);

  // ------------------------------------------------------------------
  // UI sync (throttled — never per frame)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      const m = refs.current.renderer?.getMetrics();
      if (m) setMetrics({ ...m });
      const hasPose = lastPoseRef.current !== null;
      setTracking((prev) => {
        if (!hasPose) return prev === 'tracking' || prev === 'coasting' ? 'searching' : prev;
        const latest = lastPoseRef.current;
        if (latest?.isCoasted) return 'coasting';
        return prev === 'tracking' ? prev : 'tracking';
      });
    }, APP_CONFIG.PERFORMANCE.UI_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [cameraActive]);

  // Capture + fullscreen helpers ----------------------------------------
  const captureScreenshot = useCallback((): string | null => {
    return refs.current.renderer?.captureDataURL() ?? null;
  }, []);

  /** Debug mask view gate — also lazily boots the segmenter on first use. */
  const setMaskVisible = useCallback((visible: boolean) => {
    segDebugRef.current = visible;
    if (visible && !refs.current.segmentation.isReady()) {
      void refs.current.segmentation.initialize().catch((err) => {
        logger.error('segmentation init failed', err);
      });
    }
  }, []);

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  useEffect(() => {
    const pipeline = refs.current;
    return () => {
      stopLoop();
      pipeline.camera.dispose();
      pipeline.pose.dispose();
      pipeline.segmentation.dispose();
      pipeline.clothing.dispose();
      pipeline.occlusion.dispose();
    };
  }, [stopLoop]);

  return {
    // state
    engineReady,
    initializing,
    cameraActive,
    tracking,
    garment,
    error,
    debugMode,
    metrics,
    // actions
    startCamera,
    stopCamera,
    switchCamera,
    loadGarmentFile,
    loadGarmentUrl,
    removeGarment,
    toggleDebug,
    captureScreenshot,
    setError,
    setMaskVisible,
  };
}

function rendererRefSetMirrored(renderer: Renderer | null, mirrored: boolean): void {
  renderer?.setMirrored(mirrored);
}

function mapCameraError(err: unknown): AppError {
  if (err instanceof CameraError) {
    switch (err.code) {
      case 'PERMISSION_DENIED':
        return {
          type: ErrorType.CAMERA_PERMISSION_DENIED,
          message: 'Camera access was blocked. Allow camera permission and try again.',
          timestamp: Date.now(),
        };
      case 'NOT_FOUND':
        return {
          type: ErrorType.CAMERA_UNAVAILABLE,
          message: 'No camera was found on this device.',
          timestamp: Date.now(),
        };
      case 'IN_USE':
        return {
          type: ErrorType.CAMERA_IN_USE,
          message: 'The camera is in use by another application.',
          timestamp: Date.now(),
        };
      case 'INSECURE_CONTEXT':
        return {
          type: ErrorType.INSECURE_CONTEXT,
          message: 'Camera requires HTTPS or localhost.',
          timestamp: Date.now(),
        };
      default:
        return {
          type: ErrorType.CAMERA_UNAVAILABLE,
          message: 'Failed to start the camera. Please try again.',
          timestamp: Date.now(),
        };
    }
  }
  return {
    type: ErrorType.UNKNOWN,
    message: 'Unexpected error while starting the camera.',
    timestamp: Date.now(),
  };
}
