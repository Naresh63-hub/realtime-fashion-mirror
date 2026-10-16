/**
 * PoseDetector — real-time 2D body tracking (33 landmarks).
 *
 * Technology: MediaPipe Tasks Vision `PoseLandmarker` (BLAZEPOSE_POSE)
 * running in VIDEO mode with GPU delegate when available. This is a
 * pretrained ML model — not a hand-rolled heuristic.
 *
 * Landmark topology used downstream:
 *   shoulders (11,12), elbows (13,14), wrists (15,16),
 *   hips (23,24), nose (0) — see `LandmarkIndex`.
 */

import { PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { BodyLandmark, Pose } from '../types';
import { LandmarkIndex } from '../types';
import { APP_CONFIG } from '../config';
import { ENV } from '../config/env';
import { getWasmFileset, modelUrl } from '../cv/fileset';
import { logger } from '../utils/logger';

const TORSO_LANDMARKS = [
  LandmarkIndex.LEFT_SHOULDER,
  LandmarkIndex.RIGHT_SHOULDER,
  LandmarkIndex.LEFT_HIP,
  LandmarkIndex.RIGHT_HIP,
] as const;

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private lastVideoTime = -1;
  private lastResult: PoseLandmarkerResult | null = null;
  private droppedFrameCount = 0;
  /** Shared in-flight init so concurrent callers (React StrictMode
   *  double-mount) await one graph instead of racing two. */
  private initPromise: Promise<void> | null = null;
  private disposed = false;

  async initialize(): Promise<void> {
    if (this.landmarker) return;
    if (this.initPromise) {
      await this.initPromise;
      if (this.landmarker) return;
      // Previous creation was disposed mid-flight (StrictMode unmount race);
      // fall through and create a fresh graph for this mount.
    }

    this.disposed = false;
    const creation = (async () => {
      const fileset = await getWasmFileset();
      let delegate: 'GPU' | 'CPU' = ENV.POSE_DELEGATE_GPU ? 'GPU' : 'CPU';

      // Feature-detect WebGPU if preferred; keep WebGL GPU as robust default
      if (ENV.POSE_DELEGATE_GPU && ENV.WEBGPU_PREFERRED) {
        const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
        if (hasWebGPU) {
          logger.debug('WebGPU available on device; WebGL/GPU delegate active');
        }
      }

      let landmarker: PoseLandmarker;
      try {
        landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: modelUrl(ENV.POSE_MODEL_FILE),
            delegate,
          },
          runningMode: 'VIDEO',
          numPoses: APP_CONFIG.POSE.NUM_POSES,
          minPoseDetectionConfidence: APP_CONFIG.POSE.MIN_DETECTION_CONFIDENCE,
          minPosePresenceConfidence: APP_CONFIG.POSE.MIN_PRESENCE_CONFIDENCE,
          minTrackingConfidence: APP_CONFIG.POSE.MIN_TRACKING_CONFIDENCE,
          outputSegmentationMasks: false,
        });
      } catch (gpuErr) {
        if (delegate === 'GPU') {
          logger.warn('GPU delegate init failed, falling back to CPU:', gpuErr);
          delegate = 'CPU';
          landmarker = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: modelUrl(ENV.POSE_MODEL_FILE),
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: APP_CONFIG.POSE.NUM_POSES,
            minPoseDetectionConfidence: APP_CONFIG.POSE.MIN_DETECTION_CONFIDENCE,
            minPosePresenceConfidence: APP_CONFIG.POSE.MIN_PRESENCE_CONFIDENCE,
            minTrackingConfidence: APP_CONFIG.POSE.MIN_TRACKING_CONFIDENCE,
            outputSegmentationMasks: false,
          });
        } else {
          throw gpuErr;
        }
      }

      // Unmount raced the init: release immediately instead of leaking.
      if (this.disposed) {
        landmarker.close();
        return;
      }
      this.landmarker = landmarker;

      // Google MediaPipe best practice: run 1 warmup placeholder inference to JIT-tune
      // the WASM runtime and GPU pipeline, avoiding 3-10x latency on the first live frame.
      try {
        if (typeof document !== 'undefined') {
          const warmupCanvas = document.createElement('canvas');
          warmupCanvas.width = 64;
          warmupCanvas.height = 64;
          const wctx = warmupCanvas.getContext('2d');
          if (wctx) {
            wctx.fillStyle = '#808080';
            wctx.fillRect(0, 0, 64, 64);
            landmarker.detectForVideo(warmupCanvas as unknown as HTMLVideoElement, 1);
          }
        }
      } catch (warmupErr) {
        logger.debug('PoseLandmarker placeholder warmup skipped:', warmupErr);
      }

      logger.debug('PoseLandmarker ready and warmed up');
    })();

    this.initPromise = creation.then(
      () => {
        this.initPromise = null;
      },
      (err: unknown) => {
        this.initPromise = null;
        throw err;
      }
    );
    await creation;
  }

  isReady(): boolean {
    return this.landmarker !== null;
  }

  getDroppedFrames(): number {
    return this.droppedFrameCount;
  }

  /**
   * Run detection for the current video frame.
   * Returns null when frame is stale (>MAX_FRAME_AGE_MS), duplicate timestamp,
   * or no person was found.
   */
  detectForVideo(video: HTMLVideoElement, timestampMs: number, captureTimestampMs?: number): Pose | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;

    // Frame-age check: skip stale frames older than MAX_FRAME_AGE_MS to prevent lag backlog
    if (captureTimestampMs !== undefined) {
      const age = performance.now() - captureTimestampMs;
      if (age > APP_CONFIG.POSE.MAX_FRAME_AGE_MS) {
        this.droppedFrameCount++;
        return null;
      }
    }

    // MediaPipe requires strictly increasing timestamps; skip stale frames.
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;

    let result: PoseLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, timestampMs);
    } catch (error) {
      logger.error('pose inference failed', error);
      return null;
    }

    this.lastResult = result;

    const first = result.landmarks[0];
    if (!first || first.length < 33) return null;

    const landmarks: BodyLandmark[] = first.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
    }));

    const confidence = torsoConfidence(landmarks);
    return {
      landmarks,
      timestamp: timestampMs,
      confidence,
      isCoasted: false,
    };
  }

  /** Most recent raw result (used for people-count debug info). */
  getLastResult(): PoseLandmarkerResult | null {
    return this.lastResult;
  }

  setGpuDelegate(useGpu: boolean): Promise<void> {
    if (!this.landmarker) return Promise.resolve();
    return this.landmarker.setOptions({
      baseOptions: { delegate: useGpu ? 'GPU' : 'CPU' },
    });
  }

  dispose(): void {
    this.disposed = true;
    this.landmarker?.close();
    this.landmarker = null;
    this.lastResult = null;
    this.lastVideoTime = -1;
  }
}

/** Mean visibility of torso-critical landmarks (0..1). */
export function torsoConfidence(landmarks: BodyLandmark[]): number {
  let sum = 0;
  for (const idx of TORSO_LANDMARKS) {
    sum += landmarks[idx]?.visibility ?? 0;
  }
  return sum / TORSO_LANDMARKS.length;
}
