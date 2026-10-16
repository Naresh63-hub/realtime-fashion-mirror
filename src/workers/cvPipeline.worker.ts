/**
 * cvPipeline.worker — Dedicated Web Worker for real-time body tracking,
 * garment mesh warping, and optional OffscreenCanvas rendering.
 *
 * Keeps CPU-intensive WASM ML inference and Canvas drawing completely
 * off the main UI thread to prevent UI frame drops and GC stutter.
 */

import { PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { FilesetResolver } from '@mediapipe/tasks-vision';
import type { BodyLandmark, ClothingAnchorPoints, ClothingItem, ClothingWarp, MeshTriangle, Point, Pose } from '../types';
import { LandmarkIndex } from '../types';
import { affineFromTriangles, bilinearQuad } from '../utils/geometry';

interface InitMessage {
  type: 'init';
  wasmBaseUrl: string;
  modelUrl: string;
  useGpu: boolean;
}

interface SetGarmentMessage {
  type: 'setGarment';
  garment: {
    id: string;
    width: number;
    height: number;
    anchors: ClothingAnchorPoints;
  } | null;
}

interface ProcessFrameMessage {
  type: 'processFrame';
  frame: ImageBitmap;
  timestamp: number;
  captureTime: number;
  frameWidth: number;
  frameHeight: number;
}

type IncomingMessage = InitMessage | SetGarmentMessage | ProcessFrameMessage;

let landmarker: PoseLandmarker | null = null;
let currentGarment: {
  id: string;
  width: number;
  height: number;
  anchors: ClothingAnchorPoints;
} | null = null;

let isProcessing = false;
let droppedFrames = 0;

self.onmessage = async (e: MessageEvent<IncomingMessage>): Promise<void> => {
  const data = e.data;
  if (!data) return;

  switch (data.type) {
    case 'init': {
      try {
        const fileset = await FilesetResolver.forVisionTasks(data.wasmBaseUrl);
        const lm = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: data.modelUrl,
            delegate: data.useGpu ? 'GPU' : 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });

        landmarker = lm;
        self.postMessage({ type: 'ready' });
      } catch (err) {
        self.postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }

    case 'setGarment': {
      currentGarment = data.garment;
      break;
    }

    case 'processFrame': {
      const { frame, timestamp, captureTime, frameWidth, frameHeight } = data;

      // Stale frame discipline: if another frame is already in flight,
      // or frame is older than 100ms, drop this frame immediately to avoid latency lag.
      const frameAge = performance.now() - captureTime;
      if (isProcessing || frameAge > 100) {
        droppedFrames++;
        frame.close();
        self.postMessage({
          type: 'frameDropped',
          droppedFrames,
          frameAge,
        });
        return;
      }

      if (!landmarker) {
        frame.close();
        return;
      }

      isProcessing = true;
      const t0 = performance.now();

      try {
        let result: PoseLandmarkerResult | null = null;
        try {
          result = landmarker.detectForVideo(frame, timestamp);
        } catch {
          result = null;
        }

        const inferenceMs = performance.now() - t0;
        frame.close();

        let pose: Pose | null = null;
        const first = result?.landmarks?.[0];
        if (first && first.length >= 33) {
          const landmarks: BodyLandmark[] = first.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));

          const torsoSum =
            (landmarks[LandmarkIndex.LEFT_SHOULDER]?.visibility ?? 0) +
            (landmarks[LandmarkIndex.RIGHT_SHOULDER]?.visibility ?? 0) +
            (landmarks[LandmarkIndex.LEFT_HIP]?.visibility ?? 0) +
            (landmarks[LandmarkIndex.RIGHT_HIP]?.visibility ?? 0);

          pose = {
            landmarks,
            timestamp,
            confidence: torsoSum / 4,
            isCoasted: false,
          };
        }

        // Compute warp if both pose and garment are present
        let warp: ClothingWarp | null = null;
        if (pose && currentGarment && pose.confidence >= 0.4) {
          warp = calculateWorkerWarp(pose, currentGarment, frameWidth, frameHeight);
        }

        self.postMessage({
          type: 'frameResult',
          pose,
          warp,
          inferenceMs,
          frameAge: performance.now() - captureTime,
          droppedFrames,
          timestamp,
        });
      } catch (err) {
        self.postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        isProcessing = false;
      }
      break;
    }
  }
};

function calculateWorkerWarp(
  pose: Pose,
  garment: { anchors: ClothingAnchorPoints },
  frameWidth: number,
  frameHeight: number
): ClothingWarp {
  const lm = pose.landmarks;
  const ls = lm[LandmarkIndex.LEFT_SHOULDER];
  const rs = lm[LandmarkIndex.RIGHT_SHOULDER];
  const lh = lm[LandmarkIndex.LEFT_HIP];
  const rh = lm[LandmarkIndex.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) {
    return { triangles: [], center: { x: 0, y: 0 } };
  }

  const px = (p: Point): Point => ({ x: p.x * frameWidth, y: p.y * frameHeight });
  const LS = px(ls);
  const RS = px(rs);
  const LH = px(lh);
  const RH = px(rh);

  const A = garment.anchors;
  const gShoulderMid = {
    x: (A.leftShoulder.x + A.rightShoulder.x) / 2,
    y: (A.leftShoulder.y + A.rightShoulder.y) / 2,
  };
  const gTorsoLen = Math.max(1, A.bottom.y - gShoulderMid.y);

  const bodyShoulderMid = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
  const bodyHipMid = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
  const bodyShoulderSpan = Math.hypot(RS.x - LS.x, RS.y - LS.y);
  const bodyTorsoLen = Math.max(1, Math.hypot(bodyHipMid.x - bodyShoulderMid.x, bodyHipMid.y - bodyShoulderMid.y));

  const dxX = RS.x - LS.x;
  const dyX = RS.y - LS.y;
  const lenX = Math.hypot(dxX, dyX) || 1;
  const bAxisX = { x: dxX / lenX, y: dyX / lenX };

  const dxY = bodyHipMid.x - bodyShoulderMid.x;
  const dyY = bodyHipMid.y - bodyShoulderMid.y;
  const lenY = Math.hypot(dxY, dyY) || 1;
  const bAxisY = { x: dxY / lenY, y: dyY / lenY };

  const project = (u: number, v: number): Point => {
    const uLocal = u - 0.5;
    const bx = uLocal * bodyShoulderSpan * 1.15;
    const by = v * bodyTorsoLen * 1.05;
    return {
      x: bodyShoulderMid.x + bAxisX.x * bx + bAxisY.x * by,
      y: bodyShoulderMid.y + bAxisX.y * bx + bAxisY.y * by,
    };
  };

  const garmentPoint = (u: number, v: number): Point => ({
    x: A.leftShoulder.x + (A.rightShoulder.x - A.leftShoulder.x) * u,
    y: gShoulderMid.y + gTorsoLen * v,
  });

  const cols = 6;
  const rows = 6;
  const triangles: MeshTriangle[] = [];

  const gridTargets: Point[][] = [];
  const gridSources: Point[][] = [];
  for (let r = 0; r <= rows; r++) {
    const tRow: Point[] = [];
    const sRow: Point[] = [];
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const v = r / rows;
      tRow.push(project(u, v));
      sRow.push(garmentPoint(u, v));
    }
    gridTargets.push(tRow);
    gridSources.push(sRow);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s00 = gridSources[r][c];
      const s10 = gridSources[r][c + 1];
      const s01 = gridSources[r + 1][c];
      const s11 = gridSources[r + 1][c + 1];
      const t00 = gridTargets[r][c];
      const t10 = gridTargets[r][c + 1];
      const t01 = gridTargets[r + 1][c];
      const t11 = gridTargets[r + 1][c + 1];

      triangles.push({ source: [s00, s10, s01], target: [t00, t10, t01] });
      triangles.push({ source: [s10, s11, s01], target: [t10, t11, t01] });
    }
  }

  return { triangles, center: bodyShoulderMid };
}
