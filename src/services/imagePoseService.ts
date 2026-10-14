/**
 * ImagePoseService — Landmark detection and anatomical framing analysis for static photos.
 *
 * Uses MediaPipe Tasks Vision PoseLandmarker in IMAGE mode to detect 33 body landmarks
 * on uploaded personal photographs. Calculates true shoulder line, collar position,
 * torso span, and distinguishes portrait/headshots from full-body poses.
 */

import { PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { getWasmFileset, modelUrl } from '../cv/fileset';
import { ENV } from '../config/env';
import { LandmarkIndex, type BodyLandmark } from '../types';
import { logger } from '../utils/logger';

export interface ImagePoseAnalysis {
  hasPose: boolean;
  isPortraitOrHeadshot: boolean;
  landmarks: BodyLandmark[] | null;
  shoulderMidX: number; // Normalized 0..1
  shoulderMidY: number; // Normalized 0..1
  collarY: number; // Normalized 0..1 (where garment collar notch sits)
  shoulderDistance: number; // Normalized 0..1
  rotationDeg: number; // Angle in degrees
  torsoHeight: number; // Normalized 0..1
  recommendedScale: number;
  confidence: number;
}

let staticLandmarker: PoseLandmarker | null = null;
let staticInitPromise: Promise<PoseLandmarker | null> | null = null;

async function getStaticLandmarker(): Promise<PoseLandmarker | null> {
  if (staticLandmarker) return staticLandmarker;
  if (staticInitPromise) return staticInitPromise;

  staticInitPromise = (async () => {
    try {
      const fileset = await getWasmFileset();
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: modelUrl(ENV.POSE_MODEL_FILE),
          delegate: 'CPU', // CPU is universal and thread-safe for one-off image inferences
        },
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.25,
      });
      staticLandmarker = landmarker;
      logger.info('MediaPipe static image pose landmarker ready');
      return landmarker;
    } catch (err) {
      logger.warn('Could not initialize MediaPipe for static image, falling back to geometric analysis:', err);
      return null;
    } finally {
      staticInitPromise = null;
    }
  })();

  return staticInitPromise;
}

export class ImagePoseService {
  /**
   * Analyzes an image and returns landmark anchors and recommended garment placement.
   */
  static async analyzeImage(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<ImagePoseAnalysis> {
    const width = 'naturalWidth' in imageElement ? imageElement.naturalWidth : imageElement.width;
    const height = 'naturalHeight' in imageElement ? imageElement.naturalHeight : imageElement.height;
    const isTall = height >= width;

    let rawResult: PoseLandmarkerResult | null = null;
    try {
      const landmarker = await getStaticLandmarker();
      if (landmarker) {
        rawResult = landmarker.detect(imageElement);
      }
    } catch (err) {
      logger.warn('Static pose inference error:', err);
    }

    const firstPose = rawResult?.landmarks?.[0];
    if (firstPose && firstPose.length >= 33) {
      const landmarks: BodyLandmark[] = firstPose.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 1,
      }));

      const nose = landmarks[LandmarkIndex.NOSE];
      const ls = landmarks[LandmarkIndex.LEFT_SHOULDER];
      const rs = landmarks[LandmarkIndex.RIGHT_SHOULDER];
      const lh = landmarks[LandmarkIndex.LEFT_HIP];
      const rh = landmarks[LandmarkIndex.RIGHT_HIP];
      const mouthL = landmarks[LandmarkIndex.MOUTH_LEFT];
      const mouthR = landmarks[LandmarkIndex.MOUTH_RIGHT];

      const shoulderSpan = Math.hypot(rs.x - ls.x, rs.y - ls.y);
      const shoulderMidX = (ls.x + rs.x) / 2;
      const shoulderMidY = (ls.y + rs.y) / 2;
      const angleRad = Math.atan2(rs.y - ls.y, rs.x - ls.x);
      const rotationDeg = (angleRad * 180) / Math.PI;

      // Estimate chin position
      const mouthY = mouthL && mouthR ? (mouthL.y + mouthR.y) / 2 : (nose?.y ?? 0.2) + 0.08;
      const chinY = mouthY + Math.max(0.04, (mouthY - (nose?.y ?? 0.2)) * 0.8);

      // Collar should ALWAYS sit at the clavicle / base of the neck, below chin
      let collarY = Math.max(shoulderMidY - 0.02, chinY + 0.03);

      // Distinguish portrait / bust shot from full body:
      // In close-up portraits (like headshots), the nose is typically below y = 0.22,
      // and shoulders are in the lower portion (y > 0.55).
      const isPortrait = (nose?.y ?? 0) > 0.2 || shoulderMidY > 0.5;

      // Torso height estimation
      let torsoHeight = 0.45;
      const hipVisible = (lh?.visibility ?? 0) > 0.3 && (rh?.visibility ?? 0) > 0.3 && lh.y <= 1.05;
      if (hipVisible) {
        const hipMidY = (lh.y + rh.y) / 2;
        torsoHeight = Math.max(0.2, hipMidY - collarY);
      } else {
        // Hips are out of frame (portrait or half-body shot)
        // In natural anatomy, torso height from collar is ~1.3x shoulder width
        torsoHeight = Math.min(1.0 - collarY, Math.max(0.35, shoulderSpan * 1.35));
      }

      return {
        hasPose: true,
        isPortraitOrHeadshot: isPortrait,
        landmarks,
        shoulderMidX,
        shoulderMidY,
        collarY,
        shoulderDistance: Math.max(0.18, Math.min(0.9, shoulderSpan)),
        rotationDeg,
        torsoHeight,
        recommendedScale: 1.0,
        confidence: ((ls.visibility ?? 0.5) + (rs.visibility ?? 0.5)) / 2,
      };
    }

    // Heuristic Fallback when pose detection fails (e.g. wasm unavailable or illustration)
    // For portrait photos (headshots), the head and face fill top 50-60%.
    // Shoulders start at ~0.65.
    // For landscape or full body, shoulders start around 0.26.
    const isLikelyPortrait = isTall;
    const fallbackCollarY = isLikelyPortrait ? 0.62 : 0.28;
    const fallbackShoulderDist = isLikelyPortrait ? 0.42 : 0.26;

    return {
      hasPose: false,
      isPortraitOrHeadshot: isLikelyPortrait,
      landmarks: null,
      shoulderMidX: 0.5,
      shoulderMidY: fallbackCollarY + 0.03,
      collarY: fallbackCollarY,
      shoulderDistance: fallbackShoulderDist,
      rotationDeg: 0,
      torsoHeight: isLikelyPortrait ? 0.35 : 0.45,
      recommendedScale: 1.0,
      confidence: 0.5,
    };
  }
}
