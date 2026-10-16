/**
 * ClothingEngine — garment ingestion, processing and body-anchored warping.
 *
 * Load pipeline (one-time per garment):
 *   1. validate type/size   → typed errors
 *   2. offscreen texture    (downscaled to MAX_IMAGE_SIZE)
 *   3. background removal   (deterministic flood fill → alpha)
 *   4. alpha mask           → classifier + anchor detection
 *   5. anchors              → shoulders, sleeve tips/bottoms, hem
 *
 * Per-frame pipeline (calculateWarp):
 *   - landmarks (normalized) → frame pixel space
 *   - torso mesh: garment (u,v) anchor-space grid re-projected into the
 *     body's torso frame (shoulder axis / torso axis) — this yields
 *     position, scale, rotation and bend in one geometric step
 *   - sleeve meshes: shoulder→elbow→wrist chains so sleeves follow arms
 *   - output: textured triangles for the Renderer (per-triangle affine map)
 *
 * Technology split: load steps are deterministic CV; the warp is pure
 * geometry. No inference happens here — pose arrives from PoseDetector.
 */

import type {
  ClothingAnchorPoints,
  ClothingItem,
  ClothingWarp,
  MeshTriangle,
  Point,
  Pose,
} from '../types';
import { ClothingCategory, LandmarkIndex } from '../types';
import { APP_CONFIG } from '../config';
import { ErrorType } from '../types';
import { appError } from '../utils/errors';
import { bilinearQuad } from '../utils/geometry';
import { logger } from '../utils/logger';
import { removeBackground } from './backgroundRemoval';
import { classifyGarment } from './classifier';
import { detectAnchors } from './anchorDetection';
import { TrackingSmoother } from '../utils/smoothing';

type WorkerResultPayload = {
  width: number;
  height: number;
  category: ClothingCategory;
  anchors: ClothingAnchorPoints;
  backgroundRemoved: boolean;
  processedPixels: Uint8ClampedArray;
};

type WorkerClothingConfig = {
  AUTO_BACKGROUND_REMOVAL: boolean;
  BG_TOLERANCE: number;
  BG_LUMA_THRESHOLD: number;
};

export class ClothingEngine {
  private current: ClothingItem | null = null;
  private worker: Worker | null = null;
  private smoother = new TrackingSmoother(APP_CONFIG.TRACKING.SMOOTHING_FACTOR);

  constructor() {
    const useWorker = APP_CONFIG.PERFORMANCE.USE_WORKER;
    if (useWorker && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/garmentProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch {
        this.worker = null;
      }
    }
  }

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------

  async loadFromFile(file: File): Promise<ClothingItem> {
    this.validateFile(file);
    const url = URL.createObjectURL(file);
    try {
      const item = await this.loadFromUrl(url, file.name || 'upload');
      // Keep the blob URL alive for preview; ownership transfers to `item`.
      this.trackBlob(item, url);
      return item;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async loadFromUrl(url: string, name = 'product'): Promise<ClothingItem> {
    const image = await this.loadImageElement(url);
    const item = await this.processImage(image, url, name);
    this.replaceCurrent(item);
    return item;
  }

  private blobUrls: string[] = [];

  private trackBlob(item: ClothingItem, url: string): void {
    item.imageUrl = url;
    this.blobUrls.push(url);
  }

  private replaceCurrent(item: ClothingItem): void {
    if (this.current && this.current.imageUrl.startsWith('blob:') && this.current.imageUrl !== item.imageUrl) {
      URL.revokeObjectURL(this.current.imageUrl);
      this.blobUrls = this.blobUrls.filter((u) => u !== this.current!.imageUrl);
    }
    this.current = item;
  }

  private validateFile(file: File): void {
    if (!APP_CONFIG.CLOTHING.SUPPORTED_FORMATS.includes(file.type)) {
      appError(ErrorType.CLOTHING_UNSUPPORTED_TYPE, `mime=${file.type}`);
    }
    if (file.size > APP_CONFIG.CLOTHING.MAX_UPLOAD_BYTES) {
      appError(ErrorType.CLOTHING_IMAGE_INVALID, `size=${file.size}`);
    }
  }

  private loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => {
        try {
          appError(ErrorType.CLOTHING_IMAGE_INVALID, `failed to decode image`);
        } catch (err) {
          reject(err);
        }
      };
      image.src = url;
    });
  }

  private async processImage(
    image: HTMLImageElement,
    url: string,
    name: string
  ): Promise<ClothingItem> {
    const max = APP_CONFIG.CLOTHING.MAX_IMAGE_SIZE;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const texture = document.createElement('canvas');
    texture.width = width;
    texture.height = height;
    const ctx = texture.getContext('2d', { willReadFrequently: true });
    if (!ctx) appError(ErrorType.CLOTHING_IMAGE_INVALID, 'canvas 2d unavailable');
    ctx.drawImage(image, 0, 0, width, height);

    if (this.worker) {
      return this.processImageWithWorker(ctx, texture, width, height, url, name);
    }

    return this.processImageInline(ctx, texture, width, height, url, name);
  }

  private async processImageWithWorker(
    ctx: CanvasRenderingContext2D,
    texture: HTMLCanvasElement,
    width: number,
    height: number,
    url: string,
    name: string
  ): Promise<ClothingItem> {
    const sourceImageData = ctx.getImageData(0, 0, width, height);
    const pixelTransfer = new Uint8ClampedArray(sourceImageData.data.buffer);

    const clothingConfig: WorkerClothingConfig = {
      AUTO_BACKGROUND_REMOVAL: APP_CONFIG.CLOTHING.AUTO_BACKGROUND_REMOVAL,
      BG_TOLERANCE: APP_CONFIG.CLOTHING.BG_TOLERANCE,
      BG_LUMA_THRESHOLD: APP_CONFIG.CLOTHING.BG_LUMA_THRESHOLD,
    };

    const result = await this.sendToWorker({
      imageDataTransfer: pixelTransfer,
      width,
      height,
      url,
      name,
      clothingConfig,
    }).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('no garment region')) {
        appError(ErrorType.CLOTHING_IMAGE_INVALID, 'no garment region found');
      }
      appError(ErrorType.CLOTHING_IMAGE_INVALID, message);
    });

    const { category, anchors, backgroundRemoved, processedPixels } = result;

    const finalImageData = new ImageData(
      new Uint8ClampedArray(processedPixels),
      width,
      height
    );
    ctx.putImageData(finalImageData, 0, 0);

    if (backgroundRemoved) {
      logger.debug('background removed via worker');
    }

    return {
      id: `garment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      category,
      imageUrl: url,
      texture,
      width,
      height,
      anchors,
      backgroundRemoved,
    };
  }

  private sendToWorker(payload: {
    imageDataTransfer: Uint8ClampedArray;
    width: number;
    height: number;
    url: string;
    name: string;
    clothingConfig: WorkerClothingConfig;
  }): Promise<WorkerResultPayload> {
    return new Promise((resolve, reject) => {
      const worker = this.worker;
      if (!worker) {
        reject(new Error('worker unavailable'));
        return;
      }

      const handleMessage = (e: MessageEvent): void => {
        const data = e.data;
        if (data?.type === 'result') {
          cleanup();
          resolve(data.result as WorkerResultPayload);
        } else if (data?.type === 'error') {
          cleanup();
          reject(new Error(data.message as string));
        }
      };

      const handleError = (e: ErrorEvent): void => {
        cleanup();
        reject(new Error(e.message || 'worker error'));
      };

      const cleanup = (): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      const transfer: Transferable[] = [];
      if (payload.imageDataTransfer.buffer instanceof ArrayBuffer) {
        transfer.push(payload.imageDataTransfer.buffer);
      }
      worker.postMessage({ type: 'process', ...payload }, transfer);
    });
  }

  private processImageInline(
    ctx: CanvasRenderingContext2D,
    texture: HTMLCanvasElement,
    width: number,
    height: number,
    url: string,
    name: string
  ): ClothingItem {
    let backgroundRemoved = false;
    if (APP_CONFIG.CLOTHING.AUTO_BACKGROUND_REMOVAL) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const stats = removeBackground(imageData);
      backgroundRemoved = stats.removed > 0;
      if (backgroundRemoved) {
        ctx.putImageData(imageData, 0, 0);
        logger.debug(`background removed: ${stats.removed}px`);
      }
    }

    const rgba = ctx.getImageData(0, 0, width, height);
    const mask = this.buildAlphaMask(rgba);
    const fgRatio = countForeground(mask) / (width * height);
    if (fgRatio < 0.02) {
      appError(ErrorType.CLOTHING_IMAGE_INVALID, 'no garment region found');
    }

    const category = classifyGarment(mask);
    const anchors = detectAnchors(mask);

    return {
      id: `garment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      category,
      imageUrl: url,
      texture,
      width,
      height,
      anchors,
      backgroundRemoved,
    };
  }

  private buildAlphaMask(imageData: ImageData): { data: Uint8Array; width: number; height: number } {
    const { data, width, height } = imageData;
    const mask = new Uint8Array(width * height);
    for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
      mask[p] = data[i + 3];
    }
    return { data: mask, width, height };
  }

  getCurrentGarment(): ClothingItem | null {
    return this.current;
  }

  setCurrentGarment(garment: ClothingItem | null): void {
    this.current = garment;
  }

  resetSmoother(): void {
    this.smoother.reset();
  }

  dispose(): void {
    this.smoother.reset();
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
    this.current = null;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  // ------------------------------------------------------------------
  // Per-frame warp
  // ------------------------------------------------------------------

  /**
   * Map the garment mesh onto the current body.
   *
   * Torso: garment anchors define a local frame — u along the shoulder
   * line, v from shoulder line down to the hem. Every mesh vertex is
   * re-projected through the body's torso frame (shoulder-mid origin,
   * shoulder axis, torso axis), so position, scale, rotation and bending
   * follow the body with one geometric transform.
   *
   * Sleeves: each sleeve quad is remapped onto shoulder→elbow→wrist so
   * raising an arm carries the sleeve along.
   */
  calculateWarp(
    pose: Pose,
    garment: ClothingItem,
    frameWidth: number,
    frameHeight: number
  ): ClothingWarp {
    const lm = pose.landmarks;
    const ls = lm[LandmarkIndex.LEFT_SHOULDER];
    const rs = lm[LandmarkIndex.RIGHT_SHOULDER];
    const lh = lm[LandmarkIndex.LEFT_HIP];
    const rh = lm[LandmarkIndex.RIGHT_HIP];

    // Torso landmarks must be present AND reasonably visible — otherwise
    // the garment would chase noise or freeze in a wrong pose.
    const MIN_TORSO_VISIBILITY = 0.3;
    const torsoVisible =
      (ls?.visibility ?? 0) >= MIN_TORSO_VISIBILITY &&
      (rs?.visibility ?? 0) >= MIN_TORSO_VISIBILITY &&
      (lh?.visibility ?? 0) >= MIN_TORSO_VISIBILITY;
    if (!ls || !rs || !lh || !rh || !torsoVisible) {
      return { triangles: [], center: { x: 0, y: 0 } };
    }

    const px = (p: Point): Point => ({ x: p.x * frameWidth, y: p.y * frameHeight });
    const LS = px(ls);
    const RS = px(rs);
    const LH = px(lh);
    const RH = px(rh);

    // Arm landmarks below the visibility threshold do not drive sleeves.
    const MIN_ARM_VISIBILITY = 0.35;
    const armVisible = (i: number): boolean =>
      (lm[i]?.visibility ?? 0) >= MIN_ARM_VISIBILITY;
    const LE = armVisible(LandmarkIndex.LEFT_ELBOW) ? px(lm[LandmarkIndex.LEFT_ELBOW]) : null;
    const RE = armVisible(LandmarkIndex.RIGHT_ELBOW) ? px(lm[LandmarkIndex.RIGHT_ELBOW]) : null;
    const LW = armVisible(LandmarkIndex.LEFT_WRIST) ? px(lm[LandmarkIndex.LEFT_WRIST]) : null;
    const RW = armVisible(LandmarkIndex.RIGHT_WRIST) ? px(lm[LandmarkIndex.RIGHT_WRIST]) : null;

    const A = garment.anchors;
    const gShoulderMid = midpoint(A.leftShoulder, A.rightShoulder);
    const gShoulderSpan = dist(A.leftShoulder, A.rightShoulder);
    const gTorsoLen = Math.max(1, A.bottom.y - gShoulderMid.y);

    const bodyShoulderMid = midpoint(LS, RS);
    const bodyHipMid = midpoint(LH, RH);
    const bodyShoulderSpan = dist(LS, RS);
    const bodyTorsoLen = Math.max(1, dist(bodyShoulderMid, bodyHipMid));

    // Temporal stabilization per garment part using TrackingSmoother
    const rawRotation = Math.atan2(RS.y - LS.y, RS.x - LS.x);
    const smoothedPos = this.smoother.smoothPosition(bodyShoulderMid.x, bodyShoulderMid.y);
    const smoothedSpan = this.smoother.smoothScale(bodyShoulderSpan);
    const smoothedRot = this.smoother.smoothRotation(rawRotation);

    const stabilizedShoulderMid = { x: smoothedPos.x, y: smoothedPos.y };
    const stabilizedShoulderSpan = smoothedSpan;

    // Unit axes: body frame (screen px) — +x along shoulders, +y down torso.
    const bAxisX = { x: Math.cos(smoothedRot), y: Math.sin(smoothedRot) };
    const bAxisY = normalize(sub(bodyHipMid, stabilizedShoulderMid));

    // Hip shear: horizontal hip offset from the shoulder line (bending).
    const hipShear = dot(sub(bodyHipMid, stabilizedShoulderMid), { x: -bAxisY.y, y: bAxisY.x });

    /**
     * Re-project a garment anchor-space point onto the body.
     * (u, v): u ∈ [0,1] across shoulder anchors (may extend beyond for
     * sleeves), v ∈ [0,1] shoulder-line → hem (may extend for kurti).
     */
    const project = (u: number, v: number): Point => {
      // Garment-local offsets in units of shoulder span / torso length.
      const uLocal = u - 0.5; // 0 at shoulder mid
      const vLocal = v;

      // Body-space offsets (screen px, in torso frame).
      const bx = uLocal * bodyShoulderSpan * 1.15; // slight shoulder flare
      const by = vLocal * bodyTorsoLen * 1.05; // hem reaches just past hips

      // Shear grows with vertical distance below the shoulders (bend).
      const shear = (hipShear / bodyTorsoLen) * by * 0.6;

      return {
        x: bodyShoulderMid.x + bAxisX.x * (bx + shear) + bAxisY.x * by,
        y: bodyShoulderMid.y + bAxisX.y * (bx + shear) + bAxisY.y * by,
      };
    };

    // Garment-space source point for the same (u, v) — texture pixels.
    const garmentPoint = (u: number, v: number): Point => ({
      x: A.leftShoulder.x + (A.rightShoulder.x - A.leftShoulder.x) * u,
      y: gShoulderMid.y + gTorsoLen * v,
    });

    const cols = APP_CONFIG.CLOTHING.MESH_COLS;
    const rows = APP_CONFIG.CLOTHING.MESH_ROWS;
    const triangles: MeshTriangle[] = [];

    // Torso mesh: subdivide the anchor-space rectangle and push warped
    // triangles. Grid vertices are computed once per cell boundary.
    const gridTargets: Point[][] = [];
    const gridSources: Point[][] = [];
    for (let r = 0; r <= rows; r++) {
      const tRow: Point[] = [];
      const sRow: Point[] = [];
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const v = r / rows;
        tRow.push(project(u, v));
        sRow.push(garmentPoint(u, v));
      }
      gridTargets.push(tRow);
      gridSources.push(sRow);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s00 = gridSources[r][c];
        const s10 = gridSources[r][c + 1];
        const s01 = gridSources[r + 1][c];
        const s11 = gridSources[r + 1][c + 1];
        const t00 = gridTargets[r][c];
        const t10 = gridTargets[r][c + 1];
        const t01 = gridTargets[r + 1][c];
        const t11 = gridTargets[r + 1][c + 1];

        pushTriangle(triangles, [s00, s10, s01], [t00, t10, t01]);
        pushTriangle(triangles, [s10, s11, s01], [t10, t11, t01]);
      }
    }

    // Sleeves: one mesh per side with visible elbow bend.
    for (const side of ['left', 'right'] as const) {
      const sleeveTriangles = this.buildSleeveTriangles(
        A, side, LS, RS, LE, RE, LW, RW, bodyShoulderSpan, gShoulderSpan
      );
      triangles.push(...sleeveTriangles);
    }

    return { triangles, center: bodyShoulderMid };
  }

  /**
   * Sleeve mesh for one arm: two segments (upper arm, forearm) split from
   * the garment's sleeve quad, mapped onto shoulder→elbow→wrist.
   */
  private buildSleeveTriangles(
    A: ClothingAnchorPoints,
    side: 'left' | 'right',
    LS: Point, RS: Point,
    LE: Point | null, RE: Point | null,
    LW: Point | null, RW: Point | null,
    bodyShoulderSpan: number,
    gShoulderSpan: number
  ): MeshTriangle[] {
    const gTip = side === 'left' ? A.leftSleeve : A.rightSleeve;
    const gBottom = side === 'left' ? A.leftSleeveBottom : A.rightSleeveBottom;
    const elbow = side === 'left' ? LE : RE;
    const wrist = side === 'left' ? LW : RW;
    const shoulder = side === 'left' ? LS : RS;
    if (!gTip || !elbow) return [];

    // Garment sleeve quad (texture px): inner-top is the shoulder anchor,
    // outer-top the sleeve tip, outer-bottom the sleeve bottom.
    const topInner = side === 'left' ? A.leftShoulder : A.rightShoulder;
    const topOuter = gTip;
    const bottomOuter = gBottom ?? gTip;
    const bottomInner: Point = {
      x: topInner.x + (topOuter.x - topInner.x) * 0.25,
      y: topInner.y + (topOuter.y - topInner.y) * 0.25 + (bottomOuter.y - topOuter.y) * 0.45,
    };

    // Body-frame mapping.
    const armDir = normalize(sub(elbow, shoulder));
    const armNormal: Point = { x: -armDir.y, y: armDir.x };

    // Sleeve width scales with the torso scale factor.
    const scale = gShoulderSpan > 0 ? bodyShoulderSpan / gShoulderSpan : 1;
    const sleeveWidth = dist(topInner, topOuter) * scale * 0.85;

    const armLen = dist(shoulder, elbow);
    const forearmEnd = wrist
      ? {
          x: elbow.x + (wrist.x - elbow.x) * 0.45,
          y: elbow.y + (wrist.y - elbow.y) * 0.45,
        }
      : {
          x: elbow.x + armDir.x * armLen * 0.45,
          y: elbow.y + armDir.y * armLen * 0.45,
        };

    // Inner edge: shoulder → elbow → forearm end.
    // Outer edge: same chain offset along the arm normal.
    const outer = (p: Point, factor: number): Point => ({
      x: p.x + armNormal.x * sleeveWidth * factor,
      y: p.y + armNormal.y * sleeveWidth * factor,
    });

    // Garment sleeve source interpolation across the quad.
    const srcAt = (u: number, v: number): Point =>
      bilinearQuad([topInner, topOuter, bottomOuter, bottomInner], u, v);

    const out: MeshTriangle[] = [];
    const SEGMENTS = 2; // upper arm / forearm

    for (let i = 0; i < SEGMENTS; i++) {
      const u0 = i / SEGMENTS;
      const u1 = (i + 1) / SEGMENTS;

      const chainA = i === 0 ? shoulder : elbow;
      const chainB = i === 0 ? elbow : forearmEnd;
      const offsetFactor = i === 0 ? 1 : 0.85;

      const inner0 = chainA;
      const inner1 = chainB;
      const outer0 = outer(chainA, offsetFactor);
      const outer1 = outer(chainB, offsetFactor);

      const s00 = srcAt(u0, 0);
      const s10 = srcAt(u1, 0);
      const s11 = srcAt(u1, 1);
      const s01 = srcAt(u0, 1);

      pushTriangle(out, [s00, s10, s01], [inner0, inner1, outer0]);
      pushTriangle(out, [s10, s11, s01], [inner1, outer1, outer0]);
    }

    return out;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pushTriangle(
  out: MeshTriangle[],
  source: [Point, Point, Point],
  target: [Point, Point, Point]
): void {
  if (triangleArea(target) < 1) return; // skip slivers after warping
  out.push({ source, target });
}

function triangleArea(tri: [Point, Point, Point]): number {
  const [a, b, c] = tri;
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function countForeground(mask: { data: Uint8Array; width: number; height: number }): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] > 128) count++;
  }
  return count;
}
