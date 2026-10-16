/**
 * AI Fashion Mirror — Service Worker
 *
 * Implements Cache-First caching strategy for:
 * - MediaPipe WASM binaries (~11MB)
 * - Pose Landmarker & Selfie Segmenter models (~6MB)
 *
 * Enables offline retail-floor execution and instant sub-second boot on repeat visits.
 */

const CACHE_NAME = 'fashion-mirror-models-v1';

const PRECACHE_ASSETS = [
  '/mediapipe/vision_wasm_internal.wasm',
  '/mediapipe/vision_wasm_internal.js',
  '/mediapipe/pose_landmarker_lite.task',
  '/mediapipe/selfie_segmenter.tflite',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache critical model files; non-blocking on individual failures
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache failed for ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-First strategy for MediaPipe models and wasm runtimes
  if (url.pathname.startsWith('/mediapipe/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first for other requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
