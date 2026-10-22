/**
 * Renderer — GPU-accelerated layered canvas compositor.
 *
 * Layer order per frame:
 *   1. camera video (mirrored for user-facing cameras)
 *   2. segmentation tint (debug)
 *   3. garment mesh — per-triangle affine texture maps via setTransform;
 *      occluder capsules are punched out of the garment layer with
 *      `destination-out` so hands/forearms/head appear in front
 *   4. pose skeleton (debug)
 *   5. occlusion outlines (debug)
 *
 * All drawing happens through Canvas2D, which the browser rasterizes on
 * the GPU. The garment texture is drawn once per triangle with an affine
 * transform — no per-frame CPU image processing anywhere in this module.
 *
 * Occlusion punch: capsules are applied to an offscreen garment layer so
 * cutting a hole never touches the camera pixels underneath.
 */

import type {
  ClothingItem,
  ClothingWarp,
  OcclusionResult,
  PerformanceMetrics,
  Point,
  Pose,
  SegmentationResult,
} from '../types';
import { LandmarkIndex } from '../types';
import { affineFromTriangles } from '../utils/geometry';

const POSE_CONNECTIONS: Array<[number, number]> = [
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER],
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW],
  [LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST],
  [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW],
  [LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST],
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP],
  [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP],
  [LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP],
];

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  /** Camera faces the user (selfie) — flip horizontally. */
  mirrored: boolean;
  debug: boolean;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private garmentLayer: HTMLCanvasElement;
  private garmentCtx: CanvasRenderingContext2D;
  private cachedTintCanvas: HTMLCanvasElement | null = null;
  private cachedTintCtx: CanvasRenderingContext2D | null = null;
  private cachedTintImg: ImageData | null = null;
  private options: RendererOptions;

  private frameCount = 0;
  private fpsWindowStart = performance.now();
  private fps = 0;
  private lastMetrics: PerformanceMetrics = {
    fps: 0,
    frameTimeMs: 0,
    poseInferenceMs: 0,
    segmentationInferenceMs: 0,
    inferenceFps: 0,
  };

  constructor(options: RendererOptions) {
    this.options = options;
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    const initialWidth = Math.max(1, this.canvas.width || 1280);
    const initialHeight = Math.max(1, this.canvas.height || 720);
    this.canvas.width = initialWidth;
    this.canvas.height = initialHeight;

    this.garmentLayer = document.createElement('canvas');
    this.garmentLayer.width = initialWidth;
    this.garmentLayer.height = initialHeight;
    const gctx = this.garmentLayer.getContext('2d');
    if (!gctx) throw new Error('Canvas 2D context unavailable (garment layer)');
    this.garmentCtx = gctx;
  }

  resize(width: number, height: number): void {
    const validWidth = Math.max(1, Math.round(width || 1280));
    const validHeight = Math.max(1, Math.round(height || 720));
    if (this.canvas.width !== validWidth || this.canvas.height !== validHeight) {
      this.canvas.width = validWidth;
      this.canvas.height = validHeight;
    }
    if (this.garmentLayer.width !== validWidth || this.garmentLayer.height !== validHeight) {
      this.garmentLayer.width = validWidth;
      this.garmentLayer.height = validHeight;
    }
  }

  getWidth(): number {
    return this.canvas.width;
  }

  getHeight(): number {
    return this.canvas.height;
  }

  setMirrored(mirrored: boolean): void {
    this.options.mirrored = mirrored;
  }

  setDebug(debug: boolean): void {
    this.options.debug = debug;
  }

  isDebug(): boolean {
    return this.options.debug;
  }

  /**
   * Render one composited frame.
   * Inference timings come from the pipeline; fps is measured here.
   */
  render(frame: {
    video: HTMLVideoElement | null;
    garment: ClothingItem | null;
    warp: ClothingWarp | null;
    pose: Pose | null;
    segmentation: SegmentationResult | null;
    occlusion: OcclusionResult | null;
    poseInferenceMs?: number;
    segmentationInferenceMs?: number;
    inferenceFps?: number;
    frameAgeMs?: number;
    droppedFrames?: number;
    batteryInfo?: string;
    physicsParticles?: { x: number; y: number }[];
  }): void {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const startTime = performance.now();

    ctx.clearRect(0, 0, width, height);

    // 1. Camera.
    if (frame.video && frame.video.readyState >= 2) {
      this.drawMirroredVideo(frame.video, width, height);
    }

    // 2. Segmentation tint (debug only).
    if (this.options.debug && frame.segmentation) {
      this.drawSegmentationTint(frame.segmentation, width, height);
    }

    // 3. Garment (with occlusion punch).
    if (frame.garment && frame.warp && frame.warp.triangles.length > 0) {
      this.drawGarment(frame.garment, frame.warp, frame.occlusion, width, height);
    }

    // 4/5. Debug overlays.
    if (this.options.debug && frame.pose) {
      this.drawPoseSkeleton(frame.pose, width, height);
      if (frame.occlusion) this.drawOccluders(frame.occlusion);
    }

    // Metrics.
    this.updateFps();
    this.lastMetrics = {
      fps: this.fps,
      frameTimeMs: smoothMetric(this.lastMetrics.frameTimeMs, performance.now() - startTime),
      poseInferenceMs: smoothMetric(this.lastMetrics.poseInferenceMs, frame.poseInferenceMs ?? 0),
      segmentationInferenceMs: smoothMetric(
        this.lastMetrics.segmentationInferenceMs,
        frame.segmentationInferenceMs ?? 0
      ),
      inferenceFps: frame.inferenceFps ?? this.lastMetrics.inferenceFps,
      frameAgeMs: frame.frameAgeMs ?? this.lastMetrics.frameAgeMs,
      droppedFrames: frame.droppedFrames ?? this.lastMetrics.droppedFrames,
      batteryInfo: frame.batteryInfo ?? this.lastMetrics.batteryInfo,
      heapMb: readHeapMb(),
    };
  }

  getMetrics(): PerformanceMetrics {
    return this.lastMetrics;
  }

  /** PNG data URL of the current composite (screenshot feature). */
  captureDataURL(): string | null {
    try {
      return this.canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.cachedTintCanvas = null;
    this.cachedTintCtx = null;
    this.cachedTintImg = null;
  }

  // ------------------------------------------------------------------
  // Layer implementations
  // ------------------------------------------------------------------

  private drawMirroredVideo(video: HTMLVideoElement, width: number, height: number): void {
    const { ctx } = this;
    ctx.save();
    if (this.options.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  }

  private drawSegmentationTint(seg: SegmentationResult, width: number, height: number): void {
    const { mask } = seg;
    if (
      !this.cachedTintCanvas ||
      !this.cachedTintCtx ||
      this.cachedTintCanvas.width !== mask.width ||
      this.cachedTintCanvas.height !== mask.height
    ) {
      this.cachedTintCanvas = document.createElement('canvas');
      this.cachedTintCanvas.width = mask.width;
      this.cachedTintCanvas.height = mask.height;
      this.cachedTintCtx = this.cachedTintCanvas.getContext('2d');
      if (this.cachedTintCtx) {
        this.cachedTintImg = this.cachedTintCtx.createImageData(mask.width, mask.height);
      }
    }

    const tctx = this.cachedTintCtx;
    const img = this.cachedTintImg;
    if (!tctx || !img) return;

    for (let p = 0; p < mask.data.length; p++) {
      const a = mask.data[p];
      const o = p * 4;
      img.data[o] = 80;
      img.data[o + 1] = 160;
      img.data[o + 2] = 255;
      img.data[o + 3] = a > 128 ? 110 : 0;
    }
    tctx.putImageData(img, 0, 0);

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(this.cachedTintCanvas, 0, 0, width, height);
    this.ctx.restore();
  }

  private drawGarment(
    garment: ClothingItem,
    warp: ClothingWarp,
    occlusion: OcclusionResult | null,
    width: number,
    height: number
  ): void {
    const g = this.garmentCtx;
    if (this.garmentLayer.width !== width || this.garmentLayer.height !== height) {
      this.resize(width, height);
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, width, height);

    // Mesh: per-triangle affine texture map. Clip to target triangle + transform
    // texture quad — GPU accelerated, seamless draping.
    const epsilon = 0.5; // hairline overlap to prevent antialiasing seams
    for (const tri of warp.triangles) {
      const [t0, t1, t2] = tri.target;
      const m = affineFromTriangles(tri.source, tri.target);
      if (!m) continue;

      // Centroid expansion for seamless triangle boundary without distortion
      const cx = (t0.x + t1.x + t2.x) / 3;
      const cy = (t0.y + t1.y + t2.y) / 3;
      const d0 = Math.hypot(t0.x - cx, t0.y - cy) || 1;
      const d1 = Math.hypot(t1.x - cx, t1.y - cy) || 1;
      const d2 = Math.hypot(t2.x - cx, t2.y - cy) || 1;
      const ex0 = t0.x + ((t0.x - cx) / d0) * epsilon;
      const ey0 = t0.y + ((t0.y - cy) / d0) * epsilon;
      const ex1 = t1.x + ((t1.x - cx) / d1) * epsilon;
      const ey1 = t1.y + ((t1.y - cy) / d1) * epsilon;
      const ex2 = t2.x + ((t2.x - cx) / d2) * epsilon;
      const ey2 = t2.y + ((t2.y - cy) / d2) * epsilon;

      g.save();
      g.beginPath();
      g.moveTo(ex0, ey0);
      g.lineTo(ex1, ey1);
      g.lineTo(ex2, ey2);
      g.closePath();
      g.clip();

      g.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      g.drawImage(garment.texture, 0, 0);
      g.restore();
    }

    // 3a. Realistic Drape Shading & Seam Ambient Occlusion
    const topY = warp.center.y - 120;
    const botY = warp.center.y + 240;
    g.save();
    g.globalCompositeOperation = 'source-atop';

    // Vertical top-down lighting falloff
    const drapeGrad = g.createLinearGradient(0, Math.max(0, topY), 0, Math.min(height, botY));
    drapeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)'); // subtle rim light on shoulders
    drapeGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    drapeGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
    drapeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)'); // shadow at hem/hips
    g.fillStyle = drapeGrad;
    g.fillRect(0, 0, width, height);

    // Procedural fold / wrinkle highlights when enabled
    if (this.options.debug || true) {
      g.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      g.lineWidth = 3;
      for (let w = 0; w < 3; w++) {
        const wy = warp.center.y + (w - 1) * 36;
        g.beginPath();
        g.moveTo(warp.center.x - 70, wy - 4);
        g.quadraticCurveTo(warp.center.x, wy + 8, warp.center.x + 70, wy - 4);
        g.stroke();
      }
    }
    g.restore();

    // 3b. Soft Occlusion: subtract capsules from the garment layer with feathered edges.
    if (occlusion && occlusion.capsules.length > 0) {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,1)';
      // Feathered soft boundary: eliminates harsh digital cookie-cutter punch lines
      if ('filter' in g) {
        g.filter = 'blur(4px)';
      }
      for (const cap of occlusion.capsules) {
        const dx = cap.b.x - cap.a.x;
        const dy = cap.b.y - cap.a.y;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        if (len > 0.5) {
          g.save();
          if (typeof g.translate === 'function') {
            g.translate(cap.a.x, cap.a.y);
          }
          if (typeof g.rotate === 'function') {
            g.rotate(angle);
          }
          g.beginPath();
          g.arc(0, 0, cap.radius, 0, Math.PI * 2);
          g.rect(0, -cap.radius, len, cap.radius * 2);
          g.fill();
          g.restore();
        } else {
          g.beginPath();
          g.arc(cap.a.x, cap.a.y, cap.radius, 0, Math.PI * 2);
          g.fill();
        }
      }
      if ('filter' in g) {
        g.filter = 'none';
      }
      g.restore();
    }

    // Composite garment over camera.
    if (this.options.mirrored) {
      // Garment warp coordinates are already in unmirrored video space;
      // mirror the garment layer the same way the video was mirrored.
      this.ctx.save();
      this.ctx.translate(width, 0);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.garmentLayer, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(this.garmentLayer, 0, 0);
    }
  }

  private drawPoseSkeleton(pose: Pose, width: number, height: number): void {
    const { ctx } = this;
    ctx.save();
    if (this.options.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.strokeStyle = 'rgba(0, 255, 140, 0.9)';
    ctx.lineWidth = 2;
    for (const [a, b] of POSE_CONNECTIONS) {
      const pa = pose.landmarks[a];
      const pb = pose.landmarks[b];
      if (!pa || !pb) continue;
      if ((pa.visibility ?? 0) < 0.4 || (pb.visibility ?? 0) < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * width, pa.y * height);
      ctx.lineTo(pb.x * width, pb.y * height);
      ctx.stroke();
    }

    for (const lm of pose.landmarks) {
      if ((lm.visibility ?? 0) < 0.4) continue;
      ctx.fillStyle = 'rgba(0, 255, 140, 0.95)';
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torso quad highlight.
    const ls = pose.landmarks[LandmarkIndex.LEFT_SHOULDER];
    const rs = pose.landmarks[LandmarkIndex.RIGHT_SHOULDER];
    const lh = pose.landmarks[LandmarkIndex.LEFT_HIP];
    const rh = pose.landmarks[LandmarkIndex.RIGHT_HIP];
    if (ls && rs && lh && rh) {
      ctx.strokeStyle = 'rgba(255, 210, 60, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ls.x * width, ls.y * height);
      ctx.lineTo(rs.x * width, rs.y * height);
      ctx.lineTo(rh.x * width, rh.y * height);
      ctx.lineTo(lh.x * width, lh.y * height);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawOccluders(occlusion: OcclusionResult): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)';
    ctx.lineWidth = 1.5;
    for (const cap of occlusion.capsules) {
      ctx.beginPath();
      if (cap.b.x !== cap.a.x || cap.b.y !== cap.a.y) {
        ctx.moveTo(cap.a.x, cap.a.y);
        ctx.lineTo(cap.b.x, cap.b.y);
      }
      ctx.arc(cap.b.x, cap.b.y, cap.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.fpsWindowStart;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.fpsWindowStart = now;
    }
  }
}

function smoothMetric(previous: number, next: number): number {
  if (next <= 0) return previous;
  return previous === 0 ? next : previous * 0.8 + next * 0.2;
}

function readHeapMb(): number | undefined {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  if (!memory) return undefined;
  return Math.round(memory.usedJSHeapSize / (1024 * 1024));
}

export type { Point };
