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
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: modelUrl(ENV.POSE_MODEL_FILE),
          delegate: ENV.POSE_DELEGATE_GPU ? 'GPU' : 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: APP_CONFIG.POSE.NUM_POSES,
        minPoseDetectionConfidence: APP_CONFIG.POSE.MIN_DETECTION_CONFIDENCE,
        minPosePresenceConfidence: APP_CONFIG.POSE.MIN_PRESENCE_CONFIDENCE,
        minTrackingConfidence: APP_CONFIG.POSE.MIN_TRACKING_CONFIDENCE,
        outputSegmentationMasks: false,
      });
      // Unmount raced the init: release immediately instead of leaking.
      if (this.disposed) {
        landmarker.close();
        return;
      }
      this.landmarker = landmarker;
      logger.debug('PoseLandmarker ready');
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

  /**
   * Run detection for the current video frame.
   * Returns null when nothing new was produced (duplicate timestamp)
   * or no person was found.
   */
  detectForVideo(video: HTMLVideoElement, timestampMs: number): Pose | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;

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
