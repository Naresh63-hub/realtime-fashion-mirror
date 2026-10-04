import { describe, it, expect } from 'vitest';
import { classifyGarment } from './classifier';
import { detectAnchors } from './anchorDetection';
import { ClothingCategory } from '../types';
import type { SegmentationMask } from '../types';

/** Build a mask from a row-ranges description: [y0, y1, x0, x1] rects. */
function maskFromRects(
  width: number,
  height: number,
  rects: Array<[number, number, number, number]>
): SegmentationMask {
  const data = new Uint8Array(width * height);
  for (const [y0, y1, x0, x1] of rects) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        data[y * width + x] = 255;
      }
    }
  }
  return { data, width, height };
}

describe('classifyGarment', () => {
  it('classifies a tall garment as kurti', () => {
    // 100 wide x 200 tall torso block.
    const mask = maskFromRects(100, 200, [[10, 189, 20, 79]]);
    expect(classifyGarment(mask)).toBe(ClothingCategory.KURTI);
  });

  it('classifies a torso with sleeve lobes as shirt', () => {
    // Torso + horizontal sleeve band at the top.
    const mask = maskFromRects(160, 160, [
      [20, 159, 50, 109], // torso
      [20, 50, 0, 159], // sleeve band (wide top)
    ]);
    const category = classifyGarment(mask);
    expect([ClothingCategory.SHIRT, ClothingCategory.JACKET]).toContain(category);
  });

  it('classifies a sleeveless top without sleeve lobes', () => {
    // Narrow shoulders, wider body → no mass in the top corner lobes.
    const mask = maskFromRects(120, 110, [
      [15, 40, 40, 79], // narrow shoulder band
      [40, 105, 25, 94], // wider body
    ]);
    const category = classifyGarment(mask);
    expect([ClothingCategory.TOP, ClothingCategory.T_SHIRT]).toContain(category);
  });
});

describe('detectAnchors', () => {
  it('finds shoulder anchors at the widest top band', () => {
    // T-shape: sleeve band 0..80 wide at top, torso 20..80 below.
    const mask = maskFromRects(100, 150, [
      [10, 40, 0, 99],
      [10, 140, 20, 79],
    ]);
    const anchors = detectAnchors(mask);

    expect(anchors.leftShoulder.x).toBeLessThanOrEqual(5);
    expect(anchors.rightShoulder.x).toBeGreaterThanOrEqual(94);
    expect(anchors.bottom.y).toBeGreaterThanOrEqual(135);
  });

  it('detects sleeve tips wider than the torso', () => {
    const mask = maskFromRects(120, 160, [
      [20, 35, 40, 80], // narrow shoulder band
      [50, 90, 0, 119], // sleeves flare below the shoulder band
      [20, 150, 30, 89], // torso
    ]);
    const anchors = detectAnchors(mask);

    expect(anchors.leftSleeve).toBeDefined();
    expect(anchors.rightSleeve).toBeDefined();
    if (anchors.leftSleeve && anchors.rightSleeve) {
      expect(anchors.leftSleeve.x).toBeLessThan(10);
      expect(anchors.rightSleeve.x).toBeGreaterThan(109);
    }
  });

  it('falls back to defaults on an empty mask', () => {
    const mask = maskFromRects(100, 100, []);
    const anchors = detectAnchors(mask);
    expect(anchors.leftShoulder.x).toBeCloseTo(20);
    expect(anchors.rightShoulder.x).toBeCloseTo(80);
  });

  it('finds sleeve bottoms below sleeve tips', () => {
    const mask = maskFromRects(120, 160, [
      [20, 35, 40, 80],
      [50, 90, 0, 119],
      [20, 150, 30, 89],
    ]);
    const anchors = detectAnchors(mask);
    if (anchors.leftSleeve && anchors.leftSleeveBottom) {
      expect(anchors.leftSleeveBottom.y).toBeGreaterThanOrEqual(anchors.leftSleeve.y);
    }
    if (anchors.rightSleeve && anchors.rightSleeveBottom) {
      expect(anchors.rightSleeveBottom.y).toBeGreaterThanOrEqual(anchors.rightSleeve.y);
    }
  });
});
