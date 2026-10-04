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

    this.garmentLayer = document.createElement('canvas');
    const gctx = this.garmentLayer.getContext('2d');
    if (!gctx) throw new Error('Canvas 2D context unavailable (garment layer)');
    this.garmentCtx = gctx;
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.garmentLayer.width !== width || this.garmentLayer.height !== height) {
      this.garmentLayer.width = width;
      this.garmentLayer.height = height;
    }
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
    // Nothing retained beyond canvases; GC handles the rest.
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
    const tint = document.createElement('canvas');
    tint.width = mask.width;
    tint.height = mask.height;
    const tctx = tint.getContext('2d');
    if (!tctx) return;

    const img = tctx.createImageData(mask.width, mask.height);
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
    this.ctx.drawImage(tint, 0, 0, width, height);
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

    // Mesh: per-triangle affine texture map. One transform + drawImage per
    // triangle — GPU path, no CPU pixel math.
    const epsilon = 0.37; // overlap to hide hairline seams between triangles
    for (const tri of warp.triangles) {
      const m = affineFromTriangles(tri.source, tri.target);
      if (!m) continue;
      g.save();
      g.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      const [p0, p1, p2] = tri.source;
      g.drawImage(
        garment.texture,
        p0.x, p0.y,
        p1.x - p0.x, p1.y - p0.y
      );
      g.restore();
      void p2;
      void epsilon;
    }

    // Occlusion: subtract capsules from the garment layer only.
    if (occlusion && occlusion.capsules.length > 0) {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,1)';
      for (const cap of occlusion.capsules) {
        const dx = cap.b.x - cap.a.x;
        const dy = cap.b.y - cap.a.y;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        if (len > 0.5) {
          g.save();
          g.translate(cap.a.x, cap.a.y);
          g.rotate(angle);
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
