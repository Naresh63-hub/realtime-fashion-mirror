import { describe, it, expect } from 'vitest';
import { removeBackground } from './backgroundRemoval';

function solidImage(width: number, height: number, rgb: [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe('removeBackground', () => {
  it('removes a white background around a colored garment', () => {
    const img = solidImage(50, 50, [255, 255, 255]);
    // Paint a red rectangle in the middle.
    for (let y = 15; y < 35; y++) {
      for (let x = 15; x < 35; x++) {
        const o = (y * 50 + x) * 4;
        img.data[o] = 200;
        img.data[o + 1] = 30;
        img.data[o + 2] = 30;
      }
    }

    const stats = removeBackground(img);
    expect(stats.removed).toBeGreaterThan(0);

    // Corner must be transparent now; center must stay opaque.
    const cornerAlpha = img.data[3];
    const centerAlpha = img.data[(25 * 50 + 25) * 4 + 3];
    expect(cornerAlpha).toBe(0);
    expect(centerAlpha).toBe(255);
  });

  it('removes a colored (non-white) background via flood fill', () => {
    const img = solidImage(40, 40, [180, 220, 235]);
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) {
        const o = (y * 40 + x) * 4;
        img.data[o] = 20;
        img.data[o + 1] = 90;
        img.data[o + 2] = 120;
      }
    }
    const stats = removeBackground(img);
    expect(stats.removed).toBeGreaterThan(500);
    const centerAlpha = img.data[(20 * 40 + 20) * 4 + 3];
    expect(centerAlpha).toBe(255);
  });

  it('leaves already-transparent images untouched', () => {
    const img = solidImage(30, 30, [255, 255, 255]);
    for (let i = 3; i < img.data.length; i += 4) {
      img.data[i] = 120; // meaningful alpha everywhere
    }
    const stats = removeBackground(img);
    expect(stats.removed).toBe(0);
  });

  it('does not eat the garment interior (flood fill containment)', () => {
    // White background with a white "logo" fully inside a red shirt.
    const img = solidImage(60, 60, [255, 255, 255]);
    for (let y = 10; y < 50; y++) {
      for (let x = 10; x < 50; x++) {
        const o = (y * 60 + x) * 4;
        img.data[o] = 180;
        img.data[o + 1] = 20;
        img.data[o + 2] = 20;
      }
    }
    for (let y = 25; y < 35; y++) {
      for (let x = 25; x < 35; x++) {
        const o = (y * 60 + x) * 4;
        img.data[o] = 255;
        img.data[o + 1] = 255;
        img.data[o + 2] = 255;
      }
    }
    removeBackground(img);
    const logoAlpha = img.data[(30 * 60 + 30) * 4 + 3];
    expect(logoAlpha).toBe(255); // interior white survives: not reachable from border
  });
});
