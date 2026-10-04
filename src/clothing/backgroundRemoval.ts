/**
 * Deterministic garment background removal.
 *
 * Technology: classic image processing (border flood fill on color
 * similarity + luma threshold + alpha feathering). No ML involved.
 * Works well on typical product photos (white/light-gray studio
 * backgrounds); images that already have transparency skip this pass.
 */

import { luma, rgbDistance } from '../utils/color';
import { clamp } from '../utils/geometry';
import { APP_CONFIG } from '../config';

export interface ClothingBgConfig {
  BG_TOLERANCE: number;
  BG_LUMA_THRESHOLD: number;
}

interface FloodStats {
  /** Number of pixels converted to transparent. */
  removed: number;
}

/**
 * Remove a near-uniform background from a garment image.
 * Mutates `imageData` in place (alpha channel) and returns stats.
 */
export function removeBackground(
  imageData: ImageData,
  configOverride?: ClothingBgConfig
): FloodStats {
  const { data, width, height } = imageData;
  if (hasMeaningfulAlpha(data)) return { removed: 0 };

  const cfg = configOverride ?? APP_CONFIG.CLOTHING;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const tolerance = cfg.BG_TOLERANCE;

  // Seed from border pixels: sample a few along each edge and use the
  // median-ish (first non-extreme) color as the background reference.
  const seeds: RgbSample[] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));
  for (let x = 0; x < width; x += step) {
    seeds.push(sampleAt(data, width, x, 0));
    seeds.push(sampleAt(data, width, x, height - 1));
  }
  for (let y = 0; y < height; y += step) {
    seeds.push(sampleAt(data, width, 0, y));
    seeds.push(sampleAt(data, width, width - 1, y));
  }
  const bg = averageColor(seeds);

  let removed = 0;

  const push = (idx: number): void => {
    if (!visited[idx]) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (queue.length > 0) {
    const idx = queue.pop() as number;
    const o = idx * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];

    const similar = rgbDistance({ r, g, b }, bg) < tolerance;
    const bright = luma(r, g, b) > cfg.BG_LUMA_THRESHOLD;

    if (!similar && !bright) continue;

    data[o + 3] = 0;
    removed++;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) push(idx - 1);
    if (x < width - 1) push(idx + 1);
    if (y > 0) push(idx - width);
    if (y < height - 1) push(idx + width);
  }

  featherEdges(data, width, height);
  return { removed };
}

interface RgbSample {
  r: number;
  g: number;
  b: number;
}

function sampleAt(data: Uint8ClampedArray, width: number, x: number, y: number): RgbSample {
  const o = (y * width + x) * 4;
  return { r: data[o], g: data[o + 1], b: data[o + 2] };
}

function averageColor(samples: RgbSample[]): RgbSample {
  let r = 0, g = 0, b = 0;
  for (const s of samples) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  const n = Math.max(1, samples.length);
  return { r: r / n, g: g / n, b: b / n };
}

function hasMeaningfulAlpha(data: Uint8ClampedArray): boolean {
  // Sample every 16th alpha byte for speed.
  let transparentish = 0;
  let checked = 0;
  for (let i = 3; i < data.length; i += 64) {
    checked++;
    if (data[i] < 250) transparentish++;
  }
  return checked > 0 && transparentish / checked > 0.05;
}

/** Soften the 1-px alpha boundary so cut edges are not hard aliased. */
function featherEdges(data: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4 + 3;
      const a = data[idx];
      if (a !== 255) continue;
      // If any 4-neighbor is transparent, soften this pixel a bit.
      const neighbors = [
        x > 0 ? data[idx - 4] : 255,
        x < width - 1 ? data[idx + 4] : 255,
        y > 0 ? data[idx - width * 4] : 255,
        y < height - 1 ? data[idx + width * 4] : 255,
      ];
      if (neighbors.some((na) => na === 0)) {
        data[idx] = clamp(a * 0.6, 0, 255);
      }
    }
  }
}
