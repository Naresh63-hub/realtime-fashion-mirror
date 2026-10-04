/**
 * Color-space helpers used by deterministic image-processing passes
 * (garment background removal, luma stats). Classic CV, not ML.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Perceptual luma (Rec. 601) of a pixel, 0..255. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Euclidean RGB distance. */
export function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}
