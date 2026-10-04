import { describe, it, expect } from 'vitest';
import { OcclusionEngine } from './OcclusionEngine';
import { LandmarkIndex } from '../types';
import type { BodyLandmark, Pose } from '../types';

const W = 1280;
const H = 720;

function landmark(x: number, y: number, z = 0, visibility = 1): BodyLandmark {
  return { x, y, z, visibility };
}

function pose(armZ: number, noseZ = 0): Pose {
  const landmarks: BodyLandmark[] = Array.from({ length: 33 }, () =>
    landmark(0.5, 0.5, 0, 0.2)
  );
  landmarks[LandmarkIndex.NOSE] = landmark(0.5, 0.12, noseZ);
  landmarks[LandmarkIndex.LEFT_SHOULDER] = landmark(0.4, 0.25);
  landmarks[LandmarkIndex.RIGHT_SHOULDER] = landmark(0.6, 0.25);
  landmarks[LandmarkIndex.LEFT_ELBOW] = landmark(0.37, 0.4, armZ);
  landmarks[LandmarkIndex.RIGHT_ELBOW] = landmark(0.63, 0.4, armZ);
  landmarks[LandmarkIndex.LEFT_WRIST] = landmark(0.36, 0.55, armZ);
  landmarks[LandmarkIndex.RIGHT_WRIST] = landmark(0.64, 0.55, armZ);
  landmarks[LandmarkIndex.LEFT_HIP] = landmark(0.43, 0.55, 0);
  landmarks[LandmarkIndex.RIGHT_HIP] = landmark(0.57, 0.55, 0);
  return { landmarks, timestamp: 0, confidence: 0.95, isCoasted: false };
}

describe('OcclusionEngine', () => {
  it('emits arm capsules when the arm is in front of the torso', () => {
    const engine = new OcclusionEngine(true);
    // Stabilize the Kalman filter with a few identical frames.
    let result = null;
    for (let i = 0; i < 12; i++) {
      result = engine.computeOccluders(pose(-0.2), W, H);
    }
    expect(result).not.toBeNull();
    expect(result!.capsules.length).toBeGreaterThan(0);

    // A capsule must sit near the wrist position.
    const wrist = { x: 0.64 * W, y: 0.55 * H };
    const nearWrist = result!.capsules.some((c) =>
      [c.a, c.b].some((pt) => Math.hypot(pt.x - wrist.x, pt.y - wrist.y) < 150)
    );
    expect(nearWrist).toBe(true);
  });

  it('emits no arm capsules when the arms are behind the torso', () => {
    const engine = new OcclusionEngine(true);
    let result = null;
    for (let i = 0; i < 12; i++) {
      result = engine.computeOccluders(pose(0.25), W, H);
    }
    expect(result).not.toBeNull();
    // Head capsule radius is 0.14 * bodyUnit; arm capsules are strictly
    // smaller (0.085 ratio × strength ≤ 1).
    const armCapsules =
      result!.capsules.filter((c) => c.radius <= 0.085 * 130) ?? [];
    expect(armCapsules.length).toBe(0);
  });

  it('always includes a head capsule above the shoulder line', () => {
    const engine = new OcclusionEngine(true);
    let result = null;
    for (let i = 0; i < 6; i++) {
      result = engine.computeOccluders(pose(0.3), W, H);
    }
    expect(result).not.toBeNull();
    const headCapsule = result!.capsules.find(
      (c) => c.b.y < 0.25 * H + 80
    );
    expect(headCapsule).toBeDefined();
  });

  it('produces nothing when disabled', () => {
    const engine = new OcclusionEngine(false);
    const result = engine.computeOccluders(pose(-0.2), W, H);
    expect(result).toBeNull();
  });

  it('isPointOccluded detects points inside capsules', () => {
    const engine = new OcclusionEngine(true);
    let result = null;
    for (let i = 0; i < 12; i++) {
      result = engine.computeOccluders(pose(-0.2), W, H);
    }
    expect(result).not.toBeNull();
    const wrist = { x: 0.64 * W, y: 0.55 * H };
    expect(engine.isPointOccluded(result!, wrist.x, wrist.y)).toBe(true);
    // A far corner of the frame is not occluded.
    expect(engine.isPointOccluded(result!, 10, 10)).toBe(false);
  });
});
