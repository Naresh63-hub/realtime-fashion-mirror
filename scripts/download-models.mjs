#!/usr/bin/env node
/**
 * Downloads the MediaPipe wasm runtime and task models into public/mediapipe
 * so the app is fully self-hosted (no third-party CDN at runtime).
 *
 * Usage:  npm run models
 * Models are cached; re-running only fetchs missing files (use --force to refetch).
 */

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'mediapipe');
const FORCE = process.argv.includes('--force');

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models';

const FILES = [
  // Wasm runtime (tasks-vision)
  { url: `${WASM_BASE}/vision_wasm_internal.js`, out: 'vision_wasm_internal.js' },
  { url: `${WASM_BASE}/vision_wasm_internal.wasm`, out: 'vision_wasm_internal.wasm' },
  { url: `${WASM_BASE}/vision_wasm_nosimd_internal.js`, out: 'vision_wasm_nosimd_internal.js' },
  { url: `${WASM_BASE}/vision_wasm_nosimd_internal.wasm`, out: 'vision_wasm_nosimd_internal.wasm' },

  // Pose landmarker (float16 — ~5.5 MB; use pose_landmarker_full/16 for accuracy)
  {
    url: `${MODEL_BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
    out: 'pose_landmarker_lite.task',
  },
  {
    url: `${MODEL_BASE}/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
    out: 'pose_landmarker_full.task',
  },

  // Selfie segmenter (square 256x256)
  {
    url: `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`,
    out: 'selfie_segmenter.tflite',
  },
];

/** Minimum plausible size per file — guards against truncated error pages. */
const MIN_BYTES = 10 * 1024;

async function download(url, outPath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
  const size = statSync(outPath).size;
  if (size < MIN_BYTES) {
    unlinkSync(outPath);
    throw new Error(`suspiciously small file (${size} B): ${url}`);
  }
  return size;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let failed = 0;
  for (const file of FILES) {
    const outPath = join(OUT_DIR, file.out);
    if (!FORCE && existsSync(outPath) && statSync(outPath).size >= MIN_BYTES) {
      console.log(`✓ ${file.out} (cached)`);
      continue;
    }
    process.stdout.write(`… ${file.out} `);
    try {
      const size = await download(file.url, outPath);
      console.log(`(${(size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err.message}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} file(s) failed. Re-run: npm run models`);
    process.exit(1);
  }
  console.log('\nAll models ready in public/mediapipe');
}

main();
