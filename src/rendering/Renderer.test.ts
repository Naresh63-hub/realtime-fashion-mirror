import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { Renderer } from './Renderer';
import { ClothingCategory } from '../types';
import type { ClothingItem, ClothingWarp, Pose, OcclusionResult } from '../types';

const createMockContext2D = () => {
  const gradient = {
    addColorStop: vi.fn(),
  };
  return {
    canvas: null as unknown as HTMLCanvasElement,
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arcTo: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => new ImageData(w, h)),
    putImageData: vi.fn(),
    createImageData: vi.fn((w: number, h: number) => new ImageData(w, h)),
    filter: 'none',
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
  };
};

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        if (!(this as any)._mock2d) {
          const ctx = createMockContext2D();
          ctx.canvas = this;
          (this as any)._mock2d = ctx;
        }
        return (this as any)._mock2d;
      }
      return null;
    } as any;
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(() => {
    canvas = document.createElement('canvas');
  });

  it('initializes with safe default dimensions when canvas has 0 width or height', () => {
    canvas.width = 0;
    canvas.height = 0;
    const renderer = new Renderer({ canvas, mirrored: true, debug: false });
    expect(renderer.getWidth()).toBe(1280);
    expect(renderer.getHeight()).toBe(720);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });

  it('resizes properly with valid positive dimensions', () => {
    const renderer = new Renderer({ canvas, mirrored: false, debug: false });
    renderer.resize(1920, 1080);
    expect(renderer.getWidth()).toBe(1920);
    expect(renderer.getHeight()).toBe(1080);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
  });

  it('clamps invalid or zero resize dimensions to safe defaults', () => {
    const renderer = new Renderer({ canvas, mirrored: false, debug: false });
    renderer.resize(0, 0);
    expect(renderer.getWidth()).toBe(1280);
    expect(renderer.getHeight()).toBe(720);
  });

  it('updates mirrored mode state cleanly', () => {
    const renderer = new Renderer({ canvas, mirrored: false, debug: false });
    renderer.setMirrored(true);
    // Verified through render without error
    renderer.render({
      video: null,
      garment: null,
      warp: null,
      pose: null,
      segmentation: null,
      occlusion: null,
    });
  });

  it('records metrics including frameAgeMs and droppedFrames', () => {
    const renderer = new Renderer({ canvas, mirrored: false, debug: false });
    renderer.render({
      video: null,
      garment: null,
      warp: null,
      pose: null,
      segmentation: null,
      occlusion: null,
      poseInferenceMs: 14.5,
      segmentationInferenceMs: 8.2,
      inferenceFps: 30,
      frameAgeMs: 18,
      droppedFrames: 3,
      batteryInfo: 'Battery: 85%',
    });

    const metrics = renderer.getMetrics();
    expect(metrics.frameAgeMs).toBe(18);
    expect(metrics.droppedFrames).toBe(3);
    expect(metrics.batteryInfo).toBe('Battery: 85%');
  });

  it('safely handles garment rendering without crashing', () => {
    const renderer = new Renderer({ canvas, mirrored: false, debug: false });
    const garment: ClothingItem = {
      id: 'g-test',
      name: 'Test Shirt',
      category: ClothingCategory.SHIRT,
      imageUrl: '/garments/shirt.svg',
      texture: document.createElement('canvas'),
      width: 400,
      height: 400,
      anchors: {
        leftShoulder: { x: 100, y: 50 },
        rightShoulder: { x: 300, y: 50 },
        bottom: { x: 200, y: 350 },
      },
      backgroundRemoved: true,
    };

    const warp: ClothingWarp = {
      triangles: [
        {
          source: [
            { x: 100, y: 50 },
            { x: 300, y: 50 },
            { x: 200, y: 350 },
          ],
          target: [
            { x: 400, y: 200 },
            { x: 800, y: 200 },
            { x: 600, y: 600 },
          ],
        },
      ],
      center: { x: 600, y: 400 },
    };

    const occlusion: OcclusionResult = {
      capsules: [
        {
          a: { x: 500, y: 300 },
          b: { x: 550, y: 350 },
          radius: 25,
          rounded: true,
        },
      ],
      timestamp: 100,
    };

    expect(() => {
      renderer.render({
        video: null,
        garment,
        warp,
        pose: null,
        segmentation: null,
        occlusion,
      });
    }).not.toThrow();
  });
});
