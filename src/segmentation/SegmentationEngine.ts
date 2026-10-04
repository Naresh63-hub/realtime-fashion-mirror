/**
 * SegmentationEngine — person vs background separation.
 *
 * Technology: MediaPipe Tasks Vision `ImageSegmenter` (selfie segmenter,
 * 256x256 square model) in VIDEO mode with GPU delegate when available.
 * Output is converted to a compact single-channel Uint8 mask.
 *
 * The engine is intentionally swappable: any implementation that can emit
 * a `SegmentationMask` (person=255) per frame can replace it without
 * touching renderer or clothing code (see docs/TECHNOLOGY_MAP.md).
 */

import { ImageSegmenter, type ImageSegmenterResult, type MPMask } from '@mediapipe/tasks-vision';
import type { SegmentationMask, SegmentationResult } from '../types';
import { ENV } from '../config/env';
import { getWasmFileset, modelUrl } from '../cv/fileset';
import { logger } from '../utils/logger';

export class SegmentationEngine {
  private segmenter: ImageSegmenter | null = null;
  private lastVideoTime = -1;
  private buffer: Uint8Array | null = null;
  private bufferWidth = 0;
  private bufferHeight = 0;
  /** Shared in-flight init so concurrent callers (StrictMode) await one graph. */
  private initPromise: Promise<void> | null = null;
  private disposed = false;

  async initialize(): Promise<void> {
    if (this.segmenter) return;
    if (this.initPromise) {
      await this.initPromise;
      if (this.segmenter) return;
      // Previous creation was disposed mid-flight (StrictMode unmount race);
      // fall through and create a fresh graph for this caller.
    }

    this.disposed = false;
    const creation = (async () => {
      const fileset = await getWasmFileset();
      const segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: modelUrl(ENV.SEGMENTATION_MODEL_FILE),
          delegate: ENV.SEGMENTATION_DELEGATE_GPU ? 'GPU' : 'CPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      // Unmount raced the init: release immediately instead of leaking.
      if (this.disposed) {
        segmenter.close();
        return;
      }
      this.segmenter = segmenter;
      logger.debug('ImageSegmenter ready');
    })();

    this.initPromise = creation.then(
      () => {
        this.initPromise = null;
      },
      (err: unknown) => {
        this.initPromise = null;
        throw err;
      }
    );
    await creation;
  }

  isReady(): boolean {
    return this.segmenter !== null;
  }

  /**
   * Segment the current video frame. Returns null when the frame is a
   * duplicate timestamp (already processed).
   *
   * The MPMask memory is only valid inside the callback; we copy the
   * confidence channel into a reusable buffer to keep per-frame
   * allocations at zero.
   */
  segmentForVideo(video: HTMLVideoElement, timestampMs: number): SegmentationResult | null {
    if (!this.segmenter) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;

    let result: ImageSegmenterResult | undefined;
    try {
      this.segmenter.segmentForVideo(video, timestampMs, (r) => {
        result = r;
      });
    } catch (error) {
      logger.error('segmentation failed', error);
      return null;
    }

    const confidence = result?.confidenceMasks?.[0];
    if (!confidence) return null;

    const mask = this.copyMask(confidence);
    let fg = 0;
    for (let i = 0; i < mask.data.length; i++) {
      if (mask.data[i] > 128) fg++;
    }

    return {
      mask,
      coverage: mask.data.length > 0 ? fg / mask.data.length : 0,
      timestamp: timestampMs,
    };
  }

  private copyMask(mpMask: MPMask): SegmentationMask {
    const width = mpMask.width;
    const height = mpMask.height;

    if (!this.buffer || this.bufferWidth !== width || this.bufferHeight !== height) {
      this.buffer = new Uint8Array(width * height);
      this.bufferWidth = width;
      this.bufferHeight = height;
    }

    const source = mpMask.getAsUint8Array();
    const data = this.buffer;
    data.set(source.subarray(0, data.length));
    return { data, width, height };
  }

  dispose(): void {
    this.disposed = true;
    this.segmenter?.close();
    this.segmenter = null;
    this.buffer = null;
    this.lastVideoTime = -1;
  }
}
