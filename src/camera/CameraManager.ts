/**
 * CameraManager — owns the getUserMedia lifecycle.
 *
 * Phase 1 of the pipeline. Responsibilities:
 *  - request/hold/release the MediaStream
 *  - map DOMException errors to typed camera errors
 *  - switch front/rear camera
 *  - report per-track stats (actual fps from the track settings)
 *
 * Frames are NOT copied here. The pose/segmentation engines read directly
 * from the <video> element (GPU texture path), so there is zero per-frame
 * CPU cost in this module.
 */

import type { CameraConfig, CameraErrorCode, FacingMode } from '../types';
import { APP_CONFIG } from '../config';
import { logger } from '../utils/logger';

export class CameraError extends Error {
  constructor(
    public readonly code: CameraErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private config: CameraConfig;

  constructor(config?: Partial<CameraConfig>) {
    this.config = {
      width: config?.width ?? APP_CONFIG.CAMERA.DEFAULT_WIDTH,
      height: config?.height ?? APP_CONFIG.CAMERA.DEFAULT_HEIGHT,
      facingMode: config?.facingMode ?? 'user',
      frameRate: config?.frameRate ?? APP_CONFIG.CAMERA.TARGET_FPS,
    };
  }

  /** True when running in a secure context (required by getUserMedia). */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== 'undefined' &&
      window.isSecureContext
    );
  }

  /** Enumerates all available video input devices (webcams, front/rear cameras). */
  static async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch {
      return [];
    }
  }

  async start(video: HTMLVideoElement): Promise<void> {
    if (this.stream) this.stop();

    if (!CameraManager.isSupported()) {
      throw new CameraError(
        'INSECURE_CONTEXT',
        'getUserMedia unavailable (HTTPS required)'
      );
    }

    this.video = video;

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: this.config.width },
      height: { ideal: this.config.height },
      frameRate: { ideal: this.config.frameRate, max: APP_CONFIG.CAMERA.MAX_FPS },
    };

    if (this.config.deviceId) {
      videoConstraints.deviceId = { exact: this.config.deviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.config.facingMode };
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: videoConstraints,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      this.video = null;
      throw mapGetUserMediaError(error);
    }

    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
    } catch (error) {
      // Autoplay rejection is usually transient; wait for metadata instead.
      logger.warn('video.play() rejected, waiting for canplay', error);
      await new Promise<void>((resolve) => {
        const onReady = (): void => {
          video.removeEventListener('canplay', onReady);
          resolve();
        };
        video.addEventListener('canplay', onReady, { once: true });
      });
    }

    // Apply actual device frame rate cap if the browser reports one.
    const track = this.stream.getVideoTracks()[0];
    const settings = track?.getSettings?.();
    if (settings?.frameRate) {
      this.config.frameRate = Math.round(settings.frameRate);
    }
    logger.debug('camera started', this.config, settings);
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  async switchCamera(): Promise<void> {
    if (!this.video) return;
    const next: FacingMode = this.config.facingMode === 'user' ? 'environment' : 'user';
    this.config.facingMode = next;
    this.config.deviceId = undefined;
    const video = this.video;
    this.stop();
    await this.start(video);
  }

  async switchDevice(deviceId: string): Promise<void> {
    if (!this.video) return;
    this.config.deviceId = deviceId;
    const video = this.video;
    this.stop();
    await this.start(video);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  isActive(): boolean {
    return this.stream !== null && this.stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  getFrameRate(): number {
    return this.config.frameRate;
  }

  getFacingMode(): FacingMode {
    return this.config.facingMode;
  }

  getConfig(): CameraConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  dispose(): void {
    this.stop();
  }
}

function mapGetUserMediaError(error: unknown): CameraError {
  const name = error instanceof Error ? error.name : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return new CameraError('PERMISSION_DENIED', 'Camera permission denied', error);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError('NOT_FOUND', 'No camera device found', error);
    case 'NotReadableError':
    case 'TrackStartError':
      return new CameraError('IN_USE', 'Camera already in use', error);
    case 'OverconstrainedError':
      // Retry-worthy: fall back to defaults instead of failing hard.
      return new CameraError('UNKNOWN', 'Camera constraints unsupported', error);
    default:
      return new CameraError('UNKNOWN', 'Failed to start camera', error);
  }
}
