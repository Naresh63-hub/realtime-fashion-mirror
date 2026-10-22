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

  // Bilateral hip fallback: if one hip is barely visible, reflect the confident hip
  // across the shoulder axis so the torso quad remains anatomically stable.
  const lhVis = lh.visibility ?? 1;
  const rhVis = rh.visibility ?? 1;

  let leftHip = lh;
  let rightHip = rh;

  if (lhVis < 0.35 && rhVis >= 0.35) {
    const lhX = blend(lh.x, mirror(rh.x, shoulderCx), Math.max(0, lhVis));
    const lhY = blend(lh.y, rh.y, Math.max(0, lhVis));
    leftHip = { ...lh, x: lhX, y: lhY };
  } else if (rhVis < 0.35 && lhVis >= 0.35) {
    const rhX = blend(rh.x, mirror(lh.x, shoulderCx), Math.max(0, rhVis));
    const rhY = blend(rh.y, lh.y, Math.max(0, rhVis));
    rightHip = { ...rh, x: rhX, y: rhY };
  }

  return {
    leftShoulder: ls,
    rightShoulder: rs,
    leftHip,
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

/**
 * Smooth a landmark set across frames with adaptive velocity-aware scaling.
 * Damps high-frequency micro-jitter when stationary (< 0.004 delta)
 * while reacting with low latency during rapid movements (> 0.025 delta).
 */
export function smoothLandmarks(
  previous: BodyLandmark[] | null,
  current: BodyLandmark[],
  baseAlpha: number
): BodyLandmark[] {
  if (!previous || previous.length !== current.length) return current;

  // Thresholds in normalized frame space
  const VEL_MIN = 0.004;
  const VEL_MAX = 0.025;

  return current.map((c, i) => {
    const p = previous[i];
    if (!p) return c;

    const displacement = Math.hypot(c.x - p.x, c.y - p.y);

    // Compute velocity factor: 0 = stationary (max smoothing), 1 = fast motion (min lag)
    const vFactor = Math.min(1, Math.max(0, (displacement - VEL_MIN) / (VEL_MAX - VEL_MIN)));

    // Adaptive alpha: strong smoothing (alpha up to 0.82) when still, responsive (down to 0.15) when fast
    const highDampingAlpha = Math.min(0.85, Math.max(baseAlpha, 0.72));
    const responsiveAlpha = Math.max(0.12, Math.min(baseAlpha, 0.3));
    const effectiveAlpha = highDampingAlpha * (1 - vFactor) + responsiveAlpha * vFactor;

    return {
      x: p.x + (c.x - p.x) * (1 - effectiveAlpha),
      y: p.y + (c.y - p.y) * (1 - effectiveAlpha),
      z: p.z + (c.z - p.z) * (1 - effectiveAlpha),
      visibility: p.visibility + ((c.visibility ?? 1) - p.visibility) * (1 - effectiveAlpha),
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
