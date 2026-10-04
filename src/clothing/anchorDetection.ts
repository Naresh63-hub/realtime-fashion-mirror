/**
 * Garment anchor point detection.
 *
 * Technology: deterministic CV on the alpha silhouette. For each row of
 * the garment mask we find the leftmost/rightmost opaque pixel; the
 * shoulder anchors are the extreme x positions near the top "torso band",
 * sleeve anchors are the widest points in the upper half, and the hem is
 * the centroid of the bottom band.
 *
 * Coordinates are in garment-texture pixel space.
 */

import type { ClothingAnchorPoints, Point } from '../types';
import type { SegmentationMask } from '../types';
import { clamp } from '../utils/geometry';

export function detectAnchors(mask: SegmentationMask): ClothingAnchorPoints {
  const { data, width, height } = mask;

  // Row-wise extent of opaque pixels.
  const rowExtent = new Array<{ left: number; right: number } | null>(height).fill(null);
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] > 128) {
        if (left === -1) left = x;
        right = x;
      }
    }
    if (left !== -1) rowExtent[y] = { left, right };
  }

  const firstRow = rowExtent.findIndex((r) => r !== null);
  const lastRow = rowExtent.length - 1 - [...rowExtent].reverse().findIndex((r) => r !== null);
  if (firstRow === -1) {
    // Empty mask — center-ish defaults.
    return {
      leftShoulder: { x: width * 0.2, y: height * 0.1 },
      rightShoulder: { x: width * 0.8, y: height * 0.1 },
      bottom: { x: width / 2, y: height * 0.9 },
    };
  }

  const garmentH = lastRow - firstRow + 1;

  // Shoulder band: rows between 2% and 18% of garment height.
  const bandTop = firstRow + Math.floor(garmentH * 0.02);
  const bandBottom = firstRow + Math.floor(garmentH * 0.18);

  let leftMost = { x: width, y: bandTop };
  let rightMost = { x: 0, y: bandTop };
  for (let y = bandTop; y <= Math.min(bandBottom, lastRow); y++) {
    const row = rowExtent[y];
    if (!row) continue;
    if (row.left < leftMost.x) leftMost = { x: row.left, y };
    if (row.right > rightMost.x) rightMost = { x: row.right, y };
  }

  // Sleeve tips: widest extent in the 10%..45% vertical band, only when
  // the garment is wider up there than at the shoulder band (indicates
  // actual sleeves, not just a wide top).
  const sleeveBandTop = firstRow + Math.floor(garmentH * 0.1);
  const sleeveBandBottom = firstRow + Math.floor(garmentH * 0.45);
  let sleeveLeft = { x: width, y: sleeveBandTop };
  let sleeveRight = { x: 0, y: sleeveBandTop };
  for (let y = sleeveBandTop; y <= Math.min(sleeveBandBottom, lastRow); y++) {
    const row = rowExtent[y];
    if (!row) continue;
    if (row.left < sleeveLeft.x) sleeveLeft = { x: row.left, y };
    if (row.right > sleeveRight.x) sleeveRight = { x: row.right, y };
  }

  const shoulderSpan = rightMost.x - leftMost.x;
  const sleeveSpan = sleeveRight.x - sleeveLeft.x;
  const hasSleeves = sleeveSpan > shoulderSpan * 1.12;

  // Sleeve bottom: the lowest opaque row within the sleeve x-column.
  // Bounds each sleeve vertically so the warp quad covers the full sleeve.
  const sleeveBottom = (tip: Point): Point | undefined => {
    if (!hasSleeves) return undefined;
    let bottomY = tip.y;
    for (let y = tip.y; y <= lastRow; y++) {
      const row = rowExtent[y];
      if (row && tip.x >= row.left - 2 && tip.x <= row.right + 2) {
        bottomY = y;
      }
    }
    return clampPoint({ x: tip.x, y: bottomY }, width, height);
  };

  // Hem: centroid of the bottom 8% band.
  const hemTop = lastRow - Math.floor(garmentH * 0.08);
  let hemXSum = 0;
  let hemCount = 0;
  for (let y = Math.max(hemTop, firstRow); y <= lastRow; y++) {
    const row = rowExtent[y];
    if (!row) continue;
    hemXSum += (row.left + row.right) / 2;
    hemCount++;
  }
  const hem: Point = {
    x: hemCount > 0 ? hemXSum / hemCount : width / 2,
    y: lastRow,
  };

  return {
    leftShoulder: clampPoint(leftMost, width, height),
    rightShoulder: clampPoint(rightMost, width, height),
    leftSleeve: hasSleeves ? clampPoint(sleeveLeft, width, height) : undefined,
    rightSleeve: hasSleeves ? clampPoint(sleeveRight, width, height) : undefined,
    leftSleeveBottom: sleeveBottom(sleeveLeft),
    rightSleeveBottom: sleeveBottom(sleeveRight),
    bottom: clampPoint(hem, width, height),
  };
}

function clampPoint(p: Point, width: number, height: number): Point {
  return {
    x: clamp(p.x, 0, width - 1),
    y: clamp(p.y, 0, height - 1),
  };
}
