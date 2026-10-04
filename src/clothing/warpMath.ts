/**
 * warpMath — pure, library-agnostic geometry helpers for body-aware garment
 * warping. Kept separate from {@linkClothingEngine} so the transforms can be
 * unit-tested without a canvas or a pose model, and so the "warp realism"
 * features (3D perspective, anisotropic sleeves, body-shape fit) have a single
 * documented home.
 *
 * Technology: deterministic geometry / image warping. No learned parameters,
 * no inference — these are mathematical functions of landmark positions.
 */

import type { ClothingShapeAdjustments, Point } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Body-shape fit (bust / waist / hip / height sliders)
// ---------------------------------------------------------------------------

/** Vertical band centers in garment shoulder→hem space (v ∈ [0,1]). */
const BELT_BUST_CENTER = 0.18;
const BELT_WAIST_CENTER = 0.45;
const BELT_HIP_CENTER = 0.82;
/** Gaussian falloff of each body zone (fraction of torso length). */
const BELT_SIGMA = 0.16;

function zoneWeight(v: number, center: number): number {
  const d = v - center;
  return Math.exp(-(d * d) / (2 * BELT_SIGMA * BELT_SIGMA));
}

/**
 * Horizontal beltline multiplier for a mesh row at normalized shoulder→hem
 * position `v`. Returns exactly `1.0` when every slider is neutral (0.5), so
 * the default fit reproduces the pre-fit mesh verbatim. Around each body zone
 * the width grows/shrinks toward `range` at a full slider extreme.
 */
export function beltlineWidthFactor(
  v: number,
  shape: ClothingShapeAdjustments,
  range: number
): number {
  const wBust = zoneWeight(v, BELT_BUST_CENTER);
  const wWaist = zoneWeight(v, BELT_WAIST_CENTER);
  const wHip = zoneWeight(v, BELT_HIP_CENTER);
  const wSum = wBust + wWaist + wHip || 1;
  const delta =
    ((shape.bust - 0.5) * wBust +
      (shape.waist - 0.5) * wWaist +
      (shape.hip - 0.5) * wHip) /
    wSum;
  return 1 + range * delta;
}

/**
 * Vertical (torso-length) multiplier from the height slider. `1.0` at neutral;
 * clamped to a plausible lower bound so a "short" setting never collapses the
 * mesh.
 */
export function torsoLengthFactor(
  shape: ClothingShapeAdjustments,
  range: number
): number {
  return Math.max(0.4, 1 + range * (shape.height - 0.5));
}

// ---------------------------------------------------------------------------
// 3D perspective / depth-aware foreshortening
// ---------------------------------------------------------------------------

/** Aggregate torso depth derived from the four corner landmarks' z. */
export interface TorsoDepth {
  meanZ: number;
  /** max-min spread across the torso corners; drives the plausibility gate. */
  spread: number;
}

export function torsoDepth(
  lsZ: number,
  rsZ: number,
  lhZ: number,
  rhZ: number
): TorsoDepth {
  const zs = [lsZ, rsZ, lhZ, rhZ];
  const meanZ = zs.reduce((s, z) => s + z, 0) / zs.length;
  const spread = Math.max(...zs) - Math.min(...zs);
  return { meanZ, spread };
}

/**
 * Whether the perspective pass should run for this frame. MediaPipe z is
 * approximate, so a near-planar torso (small spread) is treated as noise and
 * skipped — this prevents foreshortening from jittering the garment.
 */
export function shouldApplyPerspective(
  enabled: boolean,
  spread: number,
  minVariance: number
): boolean {
  return enabled && spread >= minVariance;
}

/**
 * Linear interpolation of landmark depth at mesh coordinate (u, v):
 * u across the shoulder line, v from shoulders (0) to hips (1).
 */
export function depthAt(
  lsZ: number,
  rsZ: number,
  lhZ: number,
  rhZ: number,
  u: number,
  v: number
): number {
  const top = lerp(lsZ, rsZ, u);
  const bottom = lerp(lhZ, rhZ, u);
  return lerp(top, bottom, v);
}

/**
 * Perspective scale factor for a point at depth `z`. A smaller z is closer to
 * the camera (MediaPipe convention) and therefore occupies a larger footprint
 * (factor > 1); the far side shrinks. Clamped to a sane range so extreme z
 * never blows the mesh up or collapses it.
 */
export function perspectiveFactor(
  z: number,
  meanZ: number,
  strength: number
): number {
  const offset = meanZ - z; // positive for nearer, negative for farther
  return clamp(1 + strength * offset, 0.7, 1.3);
}

// ---------------------------------------------------------------------------
// Anisotropic sleeve stretch
// ---------------------------------------------------------------------------

/**
 * Anisotropy scalar for a sleeve given the arm joint chain. A straight arm
 * (shoulder→elbow→wrist collinear) yields `1.0`; a bent sleeve stretches its
 * fabric along the arm and compresses it across, expressed as a value > 1.
 * `angle` is the deviation between the two bone vectors (0 = perfectly
 * straight, growing as the elbow folds), so the bend magnitude is the angle
 * itself.
 */
export function sleeveAnisotropy(
  shoulder: Point,
  elbow: Point,
  wrist: Point | null,
  gain: number
): number {
  if (!wrist) return 1;
  const v1 = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
  const v2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 < 1e-6 || m2 < 1e-6) return 1;
  const cos = clamp((v1.x * v2.x + v1.y * v2.y) / (m1 * m2), -1, 1);
  const bend = Math.acos(cos); // 0 straight, π fully folded back
  return clamp(1 + gain * bend, 1, 3);
}

/**
 * Convert a reported anisotropy into the fraction actually baked into the
 * texture-sample band. Keeps the on-screen effect subtle and bounded while the
 * full scalar stays available for a future shader/debug view.
 */
export function appliedAnisotropyScale(
  anisotropy: number,
  appliedFraction: number
): number {
  return clamp(1 + (anisotropy - 1) * appliedFraction, 1, 1.5);
}
