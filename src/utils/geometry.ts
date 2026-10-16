/** 2-D geometry helpers shared by clothing warp, occlusion and rendering. */

import type { Point } from '../types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Unsigned shortest signed angle between two 2-D direction vectors. */
export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Affine matrix [[a, c, e], [b, d, f]] mapping source triangle → target
 * triangle (both CCW/CW consistent). Solves the 2x3 linear system.
 */
export function affineFromTriangles(src: [Point, Point, Point], dst: [Point, Point, Point]) {
  const x1 = src[0].x, y1 = src[0].y;
  const x2 = src[1].x, y2 = src[1].y;
  const x3 = src[2].x, y3 = src[2].y;

  const u1 = dst[0].x, v1 = dst[0].y;
  const u2 = dst[1].x, v2 = dst[1].y;
  const u3 = dst[2].x, v3 = dst[2].y;

  const det = x1 * (y2 - y3) - x2 * (y1 - y3) + x3 * (y1 - y2);
  if (Math.abs(det) < 1e-8) {
    // Degenerate source triangle — return null so renderer skips slivers
    return null;
  }

  const a = (u1 * (y2 - y3) - u2 * (y1 - y3) + u3 * (y1 - y2)) / det;
  const b = (v1 * (y2 - y3) - v2 * (y1 - y3) + v3 * (y1 - y2)) / det;
  const c = (x1 * (u2 - u3) - x2 * (u1 - u3) + x3 * (u1 - u2)) / det;
  const d = (x1 * (v2 - v3) - x2 * (v1 - v3) + x3 * (v1 - v2)) / det;
  const e = (x1 * (y2 * u3 - y3 * u2) - x2 * (y1 * u3 - y3 * u1) + x3 * (y1 * u2 - y2 * u1)) / det;
  const f = (x1 * (y2 * v3 - y3 * v2) - x2 * (y1 * v3 - y3 * v1) + x3 * (y1 * v2 - y2 * v1)) / det;

  return { a, b, c, d, e, f };
}

/**
 * Bilinear interpolation inside a unit quad.
 * `u`, `v` in [0, 1]; corners ordered TL, TR, BR, BL.
 */
export function bilinearQuad(
  corners: [Point, Point, Point, Point],
  u: number,
  v: number
): Point {
  const [tl, tr, br, bl] = corners;
  const top = lerpPoint(tl, tr, u);
  const bottom = lerpPoint(bl, br, u);
  return lerpPoint(top, bottom, v);
}
