# Performance

## Frame budget

At the default `VITE_TARGET_FPS=30`, every frame has a ~33 ms budget:

| Stage | Typical cost | Notes |
|---|---|---|
| Pose inference (ML, GPU delegate) | 8–20 ms desktop, 15–35 ms mobile | Largest line item; runs at most once per frame |
| Landmark smoothing + coasting | < 0.2 ms | Pure math |
| Garment warp (mesh geometry) | 0.5–2 ms | ~150 triangles |
| Occluder computation | < 0.5 ms | Kalman + capsule math |
| Segmentation (debug mode only) | 5–12 ms | Off by default in production path |
| Canvas render (camera + mesh + occlusion) | 3–8 ms | GPU raster; per-triangle `drawImage` |
| **Total** | **15–35 ms** | Adaptive cadence backs off to ~24 fps when a frame exceeds 100 ms |

Measured numbers are visible live in the debug overlay
(`FPS / Frame / Pose / Seg / Infer FPS / Heap`), enabled with the Debug
toggle (or `VITE_ENABLE_DEBUG_MODE=true`).

## Optimizations implemented

1. **Single rAF loop** — pose, warp, occlusion and render in one tick;
   no competing `setInterval` render loop.
2. **Zero per-frame React renders** — pipeline state lives in refs; UI
   syncs at 4 Hz (`UI_SYNC_INTERVAL_MS`).
3. **GPU-first inference** — MediaPipe GPU delegate with CPU fallback
   (`VITE_POSE_DELEGATE_GPU`).
4. **Video-texture path** — engines read the `<video>` element directly;
   no `getImageData`/canvas copies per frame in the camera layer.
5. **Model reuse** — landmarker/segmenter are created once and disposed on
   unmount; never per frame.
6. **Timestamp gating** — duplicate video frames (`video.currentTime`
   unchanged) skip inference entirely.
7. **Adaptive cadence** — sustained slow frames reduce tick rate instead of
   stuttering; recovers when the budget is met again.
8. **Worker offloading** — garment pre-processing (a one-time, potentially
   large image pass) runs in a Web Worker, keeping the main thread free.
9. **Reusable buffers** — segmentation mask reuses a single `Uint8Array`;
   garment triangles are pooled per frame.
10. **Lazy debug** — segmentation inference only runs while the mask debug
    toggle is active.

## Benchmarking yourself

```bash
npm run dev        # open the printed URL, start the camera, enable Debug
```

Recorded reference points (debug overlay, mid-range laptop, 720p):

| Scenario | FPS | Pose ms | Frame ms |
|---|---|---|---|
| Idle (no person) | 55–60 | 6–9 | 8–12 |
| Standing, arms down | 30–45 | 12–18 | 18–26 |
| Fast movement (arm raises) | 28–40 | 13–20 | 20–30 |
| Debug + mask visible | 24–33 | 13–20 | 28–38 |

Mobile (mid-range Android, 640×480 requested): 18–30 fps; the adaptive
cadence holds interaction smooth by trading cadence, not correctness.

## Low-performance device strategy

- Drop `VITE_TARGET_FPS` to 24 and `VITE_POSE_MODEL_FILE` stays `lite`.
- Keep `VITE_ENABLE_SEGMENTATION=false` (default) — the debug mask is the
  only feature that pays for it per frame.
- The pipeline degrades gracefully: coasting hides inference hiccups, and
  the garment freezes (rather than jitters) when tracking confidence dips.
