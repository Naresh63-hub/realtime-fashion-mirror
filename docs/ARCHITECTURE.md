# Architecture

## Module map

```
src/
├── camera/        CameraManager        — getUserMedia lifecycle, typed errors, front/rear switch
├── pose/          PoseDetector         — MediaPipe PoseLandmarker (VIDEO, GPU delegate)
│                  poseGeometry        — torso frame extraction, landmark smoothing
├── segmentation/  SegmentationEngine   — MediaPipe ImageSegmenter → Uint8 person mask
├── clothing/      ClothingEngine       — ingest garment, classify, anchors, per-frame warp
│                  backgroundRemoval   — flood-fill + luma background removal
│                  classifier          — silhouette category heuristics
│                  anchorDetection     — shoulders / sleeve tips / hem from alpha mask
├── occlusion/     OcclusionEngine      — z-tested capsule occluders (arms, hands, head)
├── rendering/     Renderer             — layered canvas compositor + mesh texture maps
├── physics/       ClothPhysicsProvider — optional verlet cloth provider (Noop default)
├── workers/       garmentProcessor.worker — off-main-thread garment pre-processing
├── hooks/         useVirtualTryOn      — pipeline orchestrator (single rAF loop)
├── components/    VirtualTryOn, GarmentPanel, DebugPanel, ui atoms
├── services/      garmentCatalog       — sample product list (swap for backend)
├── i18n/          en + hi-IN locales
├── config/        env.ts (parsed VITE_*) → index.ts (APP_CONFIG)
├── cv/            fileset.ts           — shared wasm fileset for both ML engines
├── utils/         smoothing, geometry, color, errors, logger, a11y
└── types/         all shared contracts
```

Engines are wired through small, explicit contracts (`Pose`, `SegmentationMask`,
`ClothingItem`, `ClothingWarp`, `OccluderCapsule`). Any implementation producing
those shapes can replace the current engines without touching callers — that is
the swap seam for future generative try-on (see TECHNOLOGY_MAP.md).

## Frame data flow

```
rAF tick (useVirtualTryOn.processFrame)
  1. cadence gate            — adaptive interval, slow-frame backoff
  2. PoseDetector.detectForVideo(video, ts)          [ML]
  3. smoothLandmarks → confidence gate → coasting
  4. ClothingEngine.calculateWarp(pose, garment, w, h) [geometry]
  5. OcclusionEngine.computeOccluders(pose, w, h)      [geometry + z]
  6. SegmentationEngine.segmentForVideo (debug only)   [ML]
  7. Renderer.render({...})                            [GPU canvas]
  8. metrics bookkeeping (refs; UI synced at 4 Hz)
```

### Why the garment follows the body

The garment is parameterized once at load time in **anchor space**:
`u` across the shoulder anchors, `v` from the shoulder line to the hem.
Every frame, each mesh vertex is re-projected through the **body frame**:
origin at the shoulder midpoint, +x along the shoulder axis, +y along the
torso axis, with a hip-shear term for bending and independent sleeve chains
mapped onto shoulder→elbow→wrist. One geometric step therefore yields
position, scale, rotation, bend and sleeve articulation — no per-axis hacks.

### Occlusion model

The renderer draws the garment into an offscreen layer, then subtracts
capsules (elbow→wrist forearm, wrist hand disc, head disc) with
`destination-out` **only when the arm's Kalman-filtered z is in front of the
torso plane**. The composited result is drawn over the (mirrored) camera.
Occluders therefore never damage camera pixels and can be toggled freely.

## Threading model

- **Main thread:** camera video element, render loop, canvas raster, UI.
- **Worker:** garment image pre-processing (decode + background removal +
  anchors) — a one-time, ~100–500 ms pass per garment, keeping the loop
  jank-free when uploading large product photos. Inference stays on the
  main thread (MediaPipe wasm + GPU delegate manage their own scheduling;
  transferring video frames to a worker would cost more than it saves).

## State ownership

| State | Owner | Synced to UI |
|---|---|---|
| Pose, warp, occlusion, mask, metrics | refs in `useVirtualTryOn` | 4 Hz snapshot |
| Garment selection | React state + ref mirror | immediate |
| Camera/engine lifecycle | engine classes | immediate |
| Errors | typed `AppError` in state | immediate |

## Error philosophy

Engines throw typed errors (`AppErrorLike` with `ErrorType`) or return null
for per-frame soft failures (no person, duplicate frame). The hook maps
everything to user-facing `AppError` messages — stack traces never reach the
UI (see `src/utils/errors.ts` for the full message map).

## Extension seams

| Future feature | Where it plugs in |
|---|---|
| Generative try-on | Replace warp+render behind a `TryOnRenderer` interface; pose/segmentation inputs unchanged |
| Learned garment classifier | Swap `classifier.ts` internals; same signature |
| ML garment segmentation | Swap `backgroundRemoval.ts`; same signature |
| Pants / dresses / accessories | New anchors + warp region in `ClothingEngine`; category enum already open |
| Backend catalog / wardrobe | `garmentCatalog.ts` is a pure data source |
| Multi-person | `numPoses > 1` + per-pose engine instances |
| Recording | Canvas `captureStream()` at the renderer boundary |
