/**
 * Shared MediaPipe wasm fileset resolution.
 * Both engines must load the SAME wasm runtime exactly once per delegate
 * type; FilesetResolver returns a plain descriptor — no fetches happen
 * until a task is created.
 */

import { FilesetResolver } from '@mediapipe/tasks-vision';
import { ENV } from '../config/env';

export interface CvFileset {
  wasmLoaderPath: string;
  wasmBinaryPath: string;
}

let filesetPromise: Promise<CvFileset> | null = null;

/**
 * Resolve the wasm fileset from the configured base URL
 * (`/mediapipe` self-hosted by default, or a CDN via VITE_MEDIAPIPE_CDN).
 */
export function getWasmFileset(): Promise<CvFileset> {
  if (!filesetPromise) {
    const base = ENV.MEDIAPIPE_BASE_URL.replace(/\/+$/, '');
    filesetPromise = FilesetResolver.forVisionTasks(base) as unknown as Promise<CvFileset>;
  }
  return filesetPromise;
}

/** Full URL of a model file under the mediapipe base path. */
export function modelUrl(fileName: string): string {
  const base = ENV.MEDIAPIPE_BASE_URL.replace(/\/+$/, '');
  return `${base}/${fileName}`;
}
