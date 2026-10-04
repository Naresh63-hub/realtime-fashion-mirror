/**
 * Pose-derived geometric quantities used for garment alignment.
 * All coordinates are normalized [0..1] frame space; conversion to
 * pixels happens once at the clothing-warp stage.
 */

import type { BodyLandmark, Pose } from '../types';
import { LandmarkIndex } from '../types';

export interface TorsoFrame {
  leftShoulder: BodyLandmark;
  rightShoulder: BodyLandmark;
  leftHip: BodyLandmark;
  rightHip: BodyLandmark;
  /** Shoulder span (normalized) — primary scale anchor. */
  scaleAnchor: number;
  /** Shoulder line angle in radians (screen space, y down). */
  shoulderAngle: number;
}

/**
 * Extract the four torso corners from a pose. If one hip is barely visible,
 * it is mirrored about the shoulder center so the quad doesn't collapse.
 */
export function extractTorsoFrame(pose: Pose): TorsoFrame | null {
  const lm = pose.landmarks;
  const ls = lm[LandmarkIndex.LEFT_SHOULDER];
  const rs = lm[LandmarkIndex.RIGHT_SHOULDER];
  const lh = lm[LandmarkIndex.LEFT_HIP];
  const rh = lm[LandmarkIndex.RIGHT_HIP];
  if (!ls || !rs || !lh || !rh) return null;

  const shoulderCx = (ls.x + rs.x) / 2;
  const shoulderCy = (ls.y + rs.y) / 2;

  // Right-hip fallback: reflect left hip about the shoulder center when
  // visibility is too low to trust directly.
  const rhX = blend(rh.x, mirror(lh.x, shoulderCx), rh.visibility);
  const rhY = blend(rh.y, mirror(lh.y, shoulderCy), rh.visibility);
  const rightHip: BodyLandmark = { ...rh, x: rhX, y: rhY };

  return {
    leftShoulder: ls,
    rightShoulder: rs,
    leftHip: lh,
    rightHip,
    scaleAnchor: span(ls, rs),
    shoulderAngle: Math.atan2(rs.y - ls.y, rs.x - ls.x),
  };
}

function span(a: BodyLandmark, b: BodyLandmark): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function blend(a: number, b: number, t: number): number {
  // t near 1 → trust the measured value; near 0 → fall back to mirror.
  return a * t + b * (1 - t);
}

function mirror(value: number, center: number): number {
  return center + (center - value);
}

/** Smooth a landmark set across frames (per-index exponential smoothing). */
export function smoothLandmarks(
  previous: BodyLandmark[] | null,
  current: BodyLandmark[],
  alpha: number
): BodyLandmark[] {
  if (!previous || previous.length !== current.length) return current;
  return current.map((c, i) => {
    const p = previous[i];
    if (!p) return c;
    return {
      x: p.x + (c.x - p.x) * (1 - alpha),
      y: p.y + (c.y - p.y) * (1 - alpha),
      z: p.z + (c.z - p.z) * (1 - alpha),
      visibility: p.visibility + (c.visibility - p.visibility) * (1 - alpha),
    };
  });
}

/**
 * Sanity gate: shoulders above hips with a minimum span — filters out
 * wild mis-detections before they reach the garment warp.
 */
export function isTorsoPlausible(torso: TorsoFrame): boolean {
  if (span(torso.leftShoulder, torso.rightShoulder) < 0.08) return false;
  const midShoulderY = (torso.leftShoulder.y + torso.rightShoulder.y) / 2;
  const midHipY = (torso.leftHip.y + torso.rightHip.y) / 2;
  return midHipY > midShoulderY;
}
