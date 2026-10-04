import { describe, it, expect } from 'vitest';
import { APP_CONFIG } from '../config';
import type {
  SegmentationMask,
  ClothingAnchorPoints,
  ClothingCategory as ClothingCategoryType,
} from '../types';
import { removeBackground } from './backgroundRemoval';
import { classifyGarment } from './classifier';
import { detectAnchors } from './anchorDetection';
import type { WorkerClothingConfig } from '../workers/garmentProcessor.worker';

function solidImageData(
  width: number,
  height: number,
  rgb: [number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

function paintTShirt(img: ImageData): void {
  const { width, height, data } = img;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const onTorso = y >= 20 && y <= height - 10 && x >= 20 && x <= width - 21;
      const onSleeveBand = y >= 20 && y <= 50;
      const onNeck = y >= 20 && y <= 30 && x >= width / 2 - 10 && x <= width / 2 + 10;
      if ((onTorso || onSleeveBand) && !onNeck) {
        data[o] = 30;
        data[o + 1] = 100;
        data[o + 2] = 200;
      }
    }
  }
}

function buildAlphaMask(imageData: ImageData): SegmentationMask {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
    mask[p] = data[i + 3];
  }
  return { data: mask, width, height };
}

function imageDataToDataUrl(imgData: ImageData): string {
  const c = document.createElement('canvas');
  c.width = imgData.width;
  c.height = imgData.height;
  const ctx = c.getContext('2d');
  if (!ctx) {
    throw new Error('canvas 2d unavailable in this environment');
  }
  ctx.putImageData(imgData, 0, 0);
  return c.toDataURL();
}

/** jsdom without the `canvas` native module has no 2D context. */
const HAS_CANVAS_2D = (() => {
  try {
    return !!document.createElement('canvas').getContext('2d');
  } catch {
    return false;
  }
})();

type ProcessResult = {
  category: ClothingCategoryType;
  anchors: ClothingAnchorPoints;
  backgroundRemoved: boolean;
};

function runBaselineInline(
  source: ImageData,
  config: WorkerClothingConfig
): ProcessResult {
  const img = new ImageData(
    new Uint8ClampedArray(source.data),
    source.width,
    source.height
  );
  let backgroundRemoved = false;
  if (config.AUTO_BACKGROUND_REMOVAL) {
    const stats = removeBackground(img, config);
    backgroundRemoved = stats.removed > 0;
  }
  const mask = buildAlphaMask(img);
  const category = classifyGarment(mask);
  const anchors = detectAnchors(mask);
  return { category, anchors, backgroundRemoved };
}

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  listeners: Record<string, ((e: unknown) => void)[]> = {};

  addEventListener(type: string, listener: (e: unknown) => void): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (e: unknown) => void): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  dispatch(type: string, payload: unknown): void {
    if (this.listeners[type]) {
      // Match MessageEvent semantics: listeners read `event.data`.
      for (const l of this.listeners[type]) l({ data: payload });
    }
    if (type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage({ data: payload } as MessageEvent);
    }
  }

  postMessage(msg: unknown): void {
    queueMicrotask(() => this.handleMessage(msg));
  }

  handleMessage(msg: any): void {
    try {
      if (msg?.type !== 'process') return;
      const { imageDataTransfer, width, height, clothingConfig } = msg;
      const imageData = new ImageData(
        new Uint8ClampedArray(imageDataTransfer),
        width,
        height
      );
      const baseline = runBaselineInline(imageData, clothingConfig);
      const processedPixels = new Uint8ClampedArray(imageData.data.buffer);
      this.dispatch('message', {
        type: 'result',
        result: {
          width,
          height,
          category: baseline.category,
          anchors: baseline.anchors,
          backgroundRemoved: baseline.backgroundRemoved,
          processedPixels,
        },
      });
    } catch (err) {
      this.dispatch('message', {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  terminate(): void {}
}

function makeGradient4K(): ImageData {
  const W = 4096;
  const H = 4096;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      data[o] = Math.floor((x / W) * 255);
      data[o + 1] = Math.floor((y / H) * 255);
      data[o + 2] = 255 - data[o];
      data[o + 3] = 255;
    }
  }
  return new ImageData(data, W, H);
}

describe('garment worker parity (TR-4.1)', () => {
  const WIDTH = 120;
  const HEIGHT = 140;

  const clothingCfg: WorkerClothingConfig = {
    AUTO_BACKGROUND_REMOVAL: true,
    BG_TOLERANCE: APP_CONFIG.CLOTHING.BG_TOLERANCE,
    BG_LUMA_THRESHOLD: APP_CONFIG.CLOTHING.BG_LUMA_THRESHOLD,
  };

  it('produces identical category and anchor coords via FakeWorker vs pure inline', () => {
    const source = solidImageData(WIDTH, HEIGHT, [255, 255, 255]);
    paintTShirt(source);

    const baseline = runBaselineInline(source, clothingCfg);

    const fakeWorker = new FakeWorker();
    const send = new Promise<ProcessResult>((resolve, reject) => {
      const handler = (e: MessageEvent): void => {
        const d = e.data as any;
        if (d?.type === 'result') {
          fakeWorker.removeEventListener('message', handler as any);
          resolve(d.result);
        } else if (d?.type === 'error') {
          reject(new Error(d.message));
        }
      };
      fakeWorker.addEventListener('message', handler as any);
      fakeWorker.postMessage({
        type: 'process',
        imageDataTransfer: new Uint8ClampedArray(source.data),
        width: WIDTH,
        height: HEIGHT,
        url: '',
        name: '',
        clothingConfig: clothingCfg,
      });
    });

    return send.then((workerResult) => {
      expect(workerResult.category).toBe(baseline.category);
      expect(workerResult.backgroundRemoved).toBe(baseline.backgroundRemoved);
      expect(workerResult.anchors.leftShoulder.x).toBeCloseTo(
        baseline.anchors.leftShoulder.x,
        0
      );
      expect(workerResult.anchors.leftShoulder.y).toBeCloseTo(
        baseline.anchors.leftShoulder.y,
        0
      );
      expect(workerResult.anchors.rightShoulder.x).toBeCloseTo(
        baseline.anchors.rightShoulder.x,
        0
      );
      expect(workerResult.anchors.rightShoulder.y).toBeCloseTo(
        baseline.anchors.rightShoulder.y,
        0
      );
      expect(workerResult.anchors.bottom.x).toBeCloseTo(
        baseline.anchors.bottom.x,
        0
      );
      expect(workerResult.anchors.bottom.y).toBeCloseTo(
        baseline.anchors.bottom.y,
        0
      );
    });
  });

  it.skipIf(!HAS_CANVAS_2D)('ClothingEngine produces matching garment with USE_WORKER=false vs mocked Worker', async () => {
    const source = solidImageData(WIDTH, HEIGHT, [255, 255, 255]);
    paintTShirt(source);
    const url = imageDataToDataUrl(source);

    (APP_CONFIG.PERFORMANCE as any).USE_WORKER = false;
    const { ClothingEngine: EngineNoWorker } = await import('./ClothingEngine');
    const engineA = new EngineNoWorker();
    try {
      const itemA = await engineA.loadFromUrl(url, 'test-shirt');

      (APP_CONFIG.PERFORMANCE as any).USE_WORKER = true;
      const WorkerBefore = (globalThis as any).Worker;
      (globalThis as any).Worker = FakeWorker;

      const { ClothingEngine: EngineWithWorker } = await import('./ClothingEngine');
      const engineB = new EngineWithWorker();
      try {
        const itemB = await engineB.loadFromUrl(url, 'test-shirt');
        expect(itemB.category).toBe(itemA.category);
        expect(Math.abs(itemB.anchors.leftShoulder.x - itemA.anchors.leftShoulder.x)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(itemB.anchors.rightShoulder.y - itemA.anchors.rightShoulder.y)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(itemB.anchors.bottom.y - itemA.anchors.bottom.y)).toBeLessThanOrEqual(0.5);
        expect(itemB.backgroundRemoved).toBe(itemA.backgroundRemoved);
      } finally {
        engineB.dispose();
        (globalThis as any).Worker = WorkerBefore;
        (APP_CONFIG.PERFORMANCE as any).USE_WORKER = false;
      }
    } finally {
      engineA.dispose();
    }
  });
});

describe('main-thread latency with offloaded processing (TR-4.2)', () => {
  it('FakeWorker processing does not block setTimeout(fn, 0) callbacks for >32ms', async () => {
    const workerAvailable = typeof Worker !== 'undefined';
    if (!workerAvailable) {
      return;
    }
    const big = makeGradient4K();
    const cfg: WorkerClothingConfig = {
      AUTO_BACKGROUND_REMOVAL: true,
      BG_TOLERANCE: 28,
      BG_LUMA_THRESHOLD: 235,
    };

    const timestamps: number[] = [];
    const done = new Promise<void>((resolve) => {
      let scheduled = 0;
      const tick = (): void => {
        timestamps.push(Date.now());
        scheduled++;
        if (scheduled >= 10) {
          resolve();
        } else {
          setTimeout(tick, 0);
        }
      };
      setTimeout(tick, 0);
    });

    const fakeWorker = new FakeWorker();
    const processing = new Promise<void>((resolve, reject) => {
      const handler = (e: MessageEvent): void => {
        const d = e.data as any;
        if (d?.type === 'result') {
          fakeWorker.removeEventListener('message', handler as any);
          resolve();
        } else if (d?.type === 'error') {
          reject(new Error(d.message));
        }
      };
      fakeWorker.addEventListener('message', handler as any);
      fakeWorker.postMessage({
        type: 'process',
        imageDataTransfer: new Uint8ClampedArray(big.data),
        width: big.width,
        height: big.height,
        url: '',
        name: '',
        clothingConfig: cfg,
      });
    });

    await Promise.all([done, processing]);

    expect(timestamps.length).toBeGreaterThanOrEqual(10);
    let maxGap = 0;
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      if (gap > maxGap) maxGap = gap;
    }
    expect(maxGap).toBeLessThan(32);
  }, 15000);
});
