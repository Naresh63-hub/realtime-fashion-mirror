/**
 * Garment category classification.
 *
 * Technology: deterministic CV heuristics on the alpha silhouette
 * (no ML). It inspects:
 *   - overall aspect ratio of the opaque region
 *   - presence of "sleeve lobes" (opaque mass at upper left/right corners)
 *   - collar notch (transparent dip at top center)
 * Categories map to `ClothingCategory`; unknown falls back to T_SHIRT
 * behavior at the warp stage.
 */

import { ClothingCategory } from '../types';
import type { SegmentationMask } from '../types';

interface SilhouetteStats {
  aspectRatio: number;
  sleeveLobes: boolean;
  collarNotch: boolean;
  coverage: number;
}

export function classifyGarment(mask: SegmentationMask): ClothingCategory {
  const stats = silhouetteStats(mask);

  // Very tall garments (kurti/dress-like).
  if (stats.aspectRatio < 0.62) {
    return ClothingCategory.KURTI;
  }

  if (stats.sleeveLobes) {
    // Wide, with sleeves → jacket/shirt.
    if (stats.aspectRatio > 0.95) return ClothingCategory.JACKET;
    return ClothingCategory.SHIRT;
  }

  if (stats.aspectRatio > 1.05) {
    return ClothingCategory.JACKET;
  }

  // Sleeveless or subtle sleeves.
  return stats.collarNotch ? ClothingCategory.T_SHIRT : ClothingCategory.TOP;
}

function silhouetteStats(mask: SegmentationMask): SilhouetteStats {
  const { data, width, height } = mask;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  let fg = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] > 128) {
        fg++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bboxW = Math.max(1, maxX - minX + 1);
  const bboxH = Math.max(1, maxY - minY + 1);
  const coverage = fg / (bboxW * bboxH);

  const sleeveLobes = checkSleeveLobes(mask, minX, minY, bboxW, bboxH);
  const collarNotch = checkCollarNotch(mask, minX, minY, bboxW, bboxH);

  return { aspectRatio: bboxW / bboxH, sleeveLobes, collarNotch, coverage };
}

/** Opaque mass in the upper-left/upper-right bbox corners → sleeves. */
function checkSleeveLobes(
  mask: SegmentationMask,
  minX: number,
  minY: number,
  bboxW: number,
  bboxH: number
): boolean {
  const { data, width } = mask;
  const lobeW = Math.max(2, Math.floor(bboxW * 0.18));
  const lobeH = Math.max(2, Math.floor(bboxH * 0.3));

  const lobeFilled = (x0: number): number => {
    let filled = 0;
    let total = 0;
    for (let y = minY; y < Math.min(minY + lobeH, mask.height); y++) {
      for (let x = x0; x < Math.min(x0 + lobeW, mask.width); x++) {
        total++;
        if (data[y * width + x] > 128) filled++;
      }
    }
    return total > 0 ? filled / total : 0;
  };

  const left = lobeFilled(minX);
  const right = lobeFilled(minX + bboxW - lobeW);
  return left > 0.55 && right > 0.55;
}

/** Transparent dip at top-center (neck opening). */
function checkCollarNotch(
  mask: SegmentationMask,
  minX: number,
  minY: number,
  bboxW: number,
  bboxH: number
): boolean {
  const { data, width } = mask;
  const cx = minX + Math.floor(bboxW / 2);
  const bandH = Math.max(2, Math.floor(bboxH * 0.08));

  let transparent = 0;
  let total = 0;
  for (let y = minY; y < Math.min(minY + bandH, mask.height); y++) {
    for (let x = cx - Math.floor(bboxW * 0.1); x < cx + Math.floor(bboxW * 0.1); x++) {
      if (x < 0 || x >= width) continue;
      total++;
      if (data[y * width + x] <= 128) transparent++;
    }
  }
  return total > 0 && transparent / total > 0.4;
}
