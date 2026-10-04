/**
 * Unit tests for the garment mesh warp: garment anchor-space vertices must
 * land on the body frame correctly (position, scale, rotation, bending)
 * and sleeves must follow the arms.
 */

import { describe, it, expect } from 'vitest';
import { ClothingEngine } from './ClothingEngine';
import { ClothingCategory, LandmarkIndex } from '../types';
import type { ClothingItem, Pose, BodyLandmark } from '../types';

const FRAME_W = 1280;
const FRAME_H = 720;

function landmark(x: number, y: number, z = 0, visibility = 1): BodyLandmark {
  return { x, y, z, visibility };
}

/** Upright subject: shoulders level, hips below, arms along the torso. */
function uprightPose(): Pose {
  const landmarks: BodyLandmark[] = Array.from({ length: 33 }, () =>
    landmark(0.5, 0.5, 0, 0.2)
  );
  landmarks[LandmarkIndex.NOSE] = landmark(0.5, 0.12);
  landmarks[LandmarkIndex.LEFT_SHOULDER] = landmark(0.4, 0.25);
  landmarks[LandmarkIndex.RIGHT_SHOULDER] = landmark(0.6, 0.25);
  landmarks[LandmarkIndex.LEFT_ELBOW] = landmark(0.37, 0.4);
  landmarks[LandmarkIndex.RIGHT_ELBOW] = landmark(0.63, 0.4);
  landmarks[LandmarkIndex.LEFT_WRIST] = landmark(0.36, 0.55);
  landmarks[LandmarkIndex.RIGHT_WRIST] = landmark(0.64, 0.55);
  landmarks[LandmarkIndex.LEFT_HIP] = landmark(0.43, 0.55);
  landmarks[LandmarkIndex.RIGHT_HIP] = landmark(0.57, 0.55);
  return { landmarks, timestamp: 0, confidence: 0.95, isCoasted: false };
}

function testGarment(): ClothingItem {
  return {
    id: 'test-garment',
    name: 'Test Tee',
    category: ClothingCategory.T_SHIRT,
    imageUrl: 'test://tee',
    texture: document.createElement('canvas'),
    width: 200,
    height: 200,
    anchors: {
      leftShoulder: { x: 40, y: 20 },
      rightShoulder: { x: 160, y: 20 },
      leftSleeve: { x: 20, y: 40 },
      rightSleeve: { x: 180, y: 40 },
      leftSleeveBottom: { x: 20, y: 70 },
      rightSleeveBottom: { x: 180, y: 70 },
      bottom: { x: 100, y: 180 },
    },
    backgroundRemoved: true,
  };
}

describe('ClothingEngine.calculateWarp', () => {
  const engine = new ClothingEngine();
  const garment = testGarment();

  it('returns an empty warp when torso landmarks are missing', () => {
    const pose = uprightPose();
    pose.landmarks[LandmarkIndex.LEFT_HIP] = landmark(0.5, 0.5, 0, 0.01);
    const warp = engine.calculateWarp(pose, garment, FRAME_W, FRAME_H);
    expect(warp.triangles.length).toBe(0);
  });

  it('produces a mesh covering torso and sleeves', () => {
    const warp = engine.calculateWarp(uprightPose(), garment, FRAME_W, FRAME_H);
    expect(warp.triangles.length).toBeGreaterThan(60);
  });

  it('centers the garment on the torso', () => {
    const warp = engine.calculateWarp(uprightPose(), garment, FRAME_W, FRAME_H);
    const expectedCenterX = 0.5 * FRAME_W;
    const avgX =
      warp.triangles.reduce((s, t) => s + (t.target[0].x + t.target[1].x + t.target[2].x) / 3, 0) /
      warp.triangles.length;
    expect(Math.abs(avgX - expectedCenterX)).toBeLessThan(40);
  });

  it('scales with shoulder span', () => {
    const wide = uprightPose();
    wide.landmarks[LandmarkIndex.LEFT_SHOULDER] = landmark(0.3, 0.25);
    wide.landmarks[LandmarkIndex.RIGHT_SHOULDER] = landmark(0.7, 0.25);

    const warpA = engine.calculateWarp(uprightPose(), garment, FRAME_W, FRAME_H);
    const warpB = engine.calculateWarp(wide, garment, FRAME_W, FRAME_H);

    const span = (w: ReturnType<ClothingEngine['calculateWarp']>): number => {
      const top = w.triangles[0].target;
      return Math.abs(top[1].x - top[0].x);
    };
    expect(span(warpB)).toBeGreaterThan(span(warpA));
  });

  it('rotates the torso mesh with tilted shoulders', () => {
    const tilted = uprightPose();
    // Right shoulder raised by 0.05 normalized → shoulder line tilts.
    tilted.landmarks[LandmarkIndex.RIGHT_SHOULDER] = landmark(0.6, 0.2);

    const warp = engine.calculateWarp(tilted, garment, FRAME_W, FRAME_H);

    // Compare heights of mesh cells on the left vs right edge (same row).
    const leftCell = warp.triangles.find(
      (t) => t.target[0].x < 0.42 * FRAME_W && t.target[0].y < 0.3 * FRAME_H
    );
    const rightCell = warp.triangles.find(
      (t) => t.target[0].x > 0.58 * FRAME_W && t.target[0].y < 0.3 * FRAME_H
    );
    expect(leftCell).toBeDefined();
    expect(rightCell).toBeDefined();
    if (leftCell && rightCell) {
      expect(rightCell.target[0].y).toBeLessThan(leftCell.target[0].y);
    }
  });

  it('moves the garment when the body moves left', () => {
    const shifted = uprightPose();
    const dx = -0.1;
    for (const idx of [
      LandmarkIndex.LEFT_SHOULDER,
      LandmarkIndex.RIGHT_SHOULDER,
      LandmarkIndex.LEFT_HIP,
      LandmarkIndex.RIGHT_HIP,
      LandmarkIndex.NOSE,
    ]) {
      const lm = shifted.landmarks[idx];
      shifted.landmarks[idx] = { ...lm, x: lm.x + dx };
    }

    const warpA = engine.calculateWarp(uprightPose(), garment, FRAME_W, FRAME_H);
    const warpB = engine.calculateWarp(shifted, garment, FRAME_W, FRAME_H);

    const center = (w: ReturnType<ClothingEngine['calculateWarp']>): number =>
      w.triangles.reduce((s, t) => s + (t.target[0].x + t.target[1].x + t.target[2].x) / 3, 0) /
      w.triangles.length;

    expect(center(warpB)).toBeLessThan(center(warpA) - 50);
  });

  it('shears the mesh when the body bends', () => {
    const bent = uprightPose();
    // Hips shifted sideways relative to shoulders (lateral bend).
    bent.landmarks[LandmarkIndex.LEFT_HIP] = landmark(0.5, 0.55);
    bent.landmarks[LandmarkIndex.RIGHT_HIP] = landmark(0.64, 0.55);

    const warp = engine.calculateWarp(bent, garment, FRAME_W, FRAME_H);

    // Lower mesh vertices should shift right relative to upper ones.
    const topYs = warp.triangles
      .flatMap((t) => t.target)
      .filter((p) => p.y < 0.3 * FRAME_H);
    const bottomYs = warp.triangles
      .flatMap((t) => t.target)
      .filter((p) => p.y > 0.42 * FRAME_H);
    const avg = (pts: { x: number }[]): number =>
      pts.reduce((s, p) => s + p.x, 0) / Math.max(1, pts.length);
    expect(avg(bottomYs)).toBeGreaterThan(avg(topYs));
  });

  it('maps sleeve targets onto the elbow when the arm raises', () => {
    const raised = uprightPose();
    raised.landmarks[LandmarkIndex.RIGHT_ELBOW] = landmark(0.78, 0.22);
    raised.landmarks[LandmarkIndex.RIGHT_WRIST] = landmark(0.85, 0.12);

    const warp = engine.calculateWarp(raised, garment, FRAME_W, FRAME_H);

    // Some triangle target must be near the raised elbow.
    const elbowX = 0.78 * FRAME_W;
    const elbowY = 0.22 * FRAME_H;
    const nearElbow = warp.triangles.some((t) =>
      t.target.some((p) => Math.hypot(p.x - elbowX, p.y - elbowY) < 60)
    );
    expect(nearElbow).toBe(true);
  });

  it('skips sleeves when elbow landmarks are missing', () => {
    const noArms = uprightPose();
    noArms.landmarks[LandmarkIndex.LEFT_ELBOW] = landmark(0.5, 0.5, 0, 0.01);
    noArms.landmarks[LandmarkIndex.RIGHT_ELBOW] = landmark(0.5, 0.5, 0, 0.01);

    const warpFull = engine.calculateWarp(uprightPose(), garment, FRAME_W, FRAME_H);
    const warpNone = engine.calculateWarp(noArms, garment, FRAME_W, FRAME_H);
    expect(warpNone.triangles.length).toBeLessThan(warpFull.triangles.length);
  });
});
