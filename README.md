# AI Fashion Mirror

Real-time, body-tracked virtual clothing try-on that runs **entirely in the
browser**. Select or upload a garment, stand in front of your camera, and the
clothing appears anchored to your torso — following you as you move, bend,
rotate, and raise your arms.

```
Camera ─► Pose (ML) ─► Body frame ─► Garment warp ─► Occlusion ─► GPU render ─► Live output
              │                                                          ▲
              └── Segmentation (ML, debug) ──────────────────────────────┘
```

## What problem it solves

Online clothing shoppers cannot judge fit or drape from flat product photos.
This app gives immediate, moving-body feedback with zero server round-trips:
the live camera stream is interpreted on-device and the garment is re-anchored
to the person's body **every frame** — it is not a static sticker.

What that means concretely:

| You… | The garment… |
|---|---|
| Move left/right/forward | Re-centers and rescales with your torso |
| Tilt or rotate your shoulders | Rotates with your shoulder axis |
| Bend sideways | Shears with your hip offset |
| Raise an arm | The sleeve follows shoulder → elbow → wrist |
| Raise a hand in front of your chest | The hand punches through the garment (occlusion) |
| Turn away briefly | Coasting keeps it stable through short tracking dropouts |

## How the CV pipeline works

1. **Camera** (`camera/CameraManager`) — `getUserMedia` with typed error
   mapping, front/rear switching, device-reported fps. Frames stay a GPU video
   texture; nothing is copied to CPU buffers here.
2. **Pose** (`pose/PoseDetector`) — MediaPipe **PoseLandmarker** (33 landmarks,
   VIDEO mode, WebGL GPU delegate) runs per tick. Torso landmarks
   (shoulders/hips) form the body frame; arms provide sleeve targets.
3. **Smoothing & coasting** (`pose/poseGeometry`, `utils/smoothing`) —
   per-landmark exponential smoothing, a torso-confidence gate, and time-boxed
   coasting so the garment neither jitters nor vanishes on detection hiccups.
4. **Segmentation** (`segmentation/SegmentationEngine`) — MediaPipe
   **ImageSegmenter** produces a person/background mask. It's wired for debug
   visualization and is the refinement point for future occlusion/fit work.
5. **Garment processing** (`clothing/*`) — one-time per garment: validate →
   downscale → **background removal** (border flood-fill + luma threshold +
   feathering) → alpha-mask analysis → **category** (tee/shirt/jacket/top/kurti
   via silhouette heuristics) → **anchor points** (shoulder tips, sleeve
   tips/bottoms, hem). Runs in a **Web Worker** to keep the main thread free.
6. **Warp** (`clothing/ClothingEngine.calculateWarp`) — the garment is a mesh
   in *anchor space* (u across shoulders, v shoulder→hem). Each vertex is
   re-projected through the *body frame* every frame: position, scale,
   rotation, bend shear and sleeve articulation come out of one geometric
   transform.
7. **Occlusion** (`occlusion/OcclusionEngine`) — forearm/hand/head capsules
   are subtracted from the garment layer only when the arm's Kalman-filtered
   z-depth is in front of the torso plane.
8. **Render** (`rendering/Renderer`) — layered Canvas2D (GPU raster): mirrored
   camera → garment mesh (per-triangle affine texture maps) with occlusion
   punch → debug overlays.

### How clothing follows movement (in one paragraph)

Garment anchors measured from the product image define a local coordinate
system. The detected shoulders/hips define the body's coordinate system. The
warp re-expresses every garment vertex in body coordinates each frame — so
when the body translates, scales, rotates, or bends, the garment inherits
exactly that motion, with sleeves driven independently by elbow/wrist
landmarks. This is real deformation, not image translation.

### Why client-side processing

- **Privacy:** camera frames never leave the device. There is no upload
  endpoint in this codebase; the "Upload product image" button reads files
  with `URL.createObjectURL` and processes them locally.
- **Latency:** no network hop can sustain 30 fps; inference runs against the
  video texture at sensor speed.
- **Cost & scale:** inference is ~10 ms of GPU/wasm time per frame — cheap to
  give every user, impossible to run server-side at that rate.

## Technology honesty

This is a **pretrained-ML + deterministic-CV** system, and the code keeps the
distinction explicit. Pose and person segmentation are pretrained neural
networks (MediaPipe). Garment analysis, warping, and occlusion are
deterministic geometry and image processing — no learned parameters. No
generative model is used anywhere. The full feature-by-feature attribution
lives in [docs/TECHNOLOGY_MAP.md](docs/TECHNOLOGY_MAP.md).

## Performance

Budget, benchmarks, and the ten implemented optimizations (single rAF loop,
zero per-frame React renders, GPU delegates, timestamp gating, adaptive
cadence, worker offload, buffer reuse…) are documented in
[docs/PERFORMANCE.md](docs/PERFORMANCE.md). Reference: **30–45 fps** with
12–20 ms pose inference on a mid-range laptop at 720p; the debug overlay
(`Debug` toggle) shows live FPS / frame / pose / segmentation / heap numbers
in developer mode only — regular users never see technical telemetry.

## Known limitations

- **Single person** per frame (by design; `numPoses: 1`).
- **Occlusion depth is coarse** — pose z is approximate; an arm behind the
  back can occasionally be judged "in front". The segmentation mask can
  refine this later.
- **Background removal** targets studio/uniform backdrops; busy scenes need
  an ML segmenter (swap point provided).
- **Category heuristic** is silhouette-based; a learned classifier is a
  drop-in replacement.
- **No cloth physics by default** — the `physics/` provider interface exists
  (Verlet-ready) but the default provider is a no-op.
- **Fit is visual, not measured** — no body measurements or size advice yet.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Download models ONCE (wasm runtime + pose/segmenter models → public/mediapipe)
npm run models

# 3. Start the dev server
npm run dev            # open the printed URL — camera requires localhost or HTTPS

# Production build
npm run build && npm run preview
```

Requirements: Node 18+, a browser with WebGL (all modern browsers), a camera.
HTTPS or localhost is mandatory for camera access.

### Environment variables

All configuration flows through `VITE_*` vars parsed in `src/config/env.ts`
 — copy [.env.example](.env.example) and adjust. Key knobs:

| Var | Default | Purpose |
|---|---|---|
| `VITE_POSE_MODEL_FILE` | `pose_landmarker_lite.task` | swap to `pose_landmarker_full.task` for accuracy |
| `VITE_MEDIAPIPE_CDN` | `/mediapipe` | model/wasm base URL (self-hosted by default) |
| `VITE_TARGET_FPS` | `30` | pipeline cadence target |
| `VITE_TRACKING_SMOOTHING_FACTOR` | `0.35` | 0 raw … 1 frozen |
| `VITE_TRACKING_CONFIDENCE` | `0.55` | torso visibility gate for warping |
| `VITE_POSE_DELEGATE_GPU` | `true` | WebGL delegate for pose inference |
| `VITE_ENABLE_OCCLUSION` | `true` | capsule occlusion |
| `VITE_ENABLE_DEBUG_MODE` | `false` | developer HUD + skeleton + mask |
| `VITE_MAX_UPLOAD_BYTES` | `8388608` | garment upload size limit |

### Model installation

`npm run models` downloads and caches into `public/mediapipe/`:

| File | Size | Role |
|---|---|---|
| `vision_wasm_internal.(js/wasm)` (+ nosimd) | ~22 MB | MediaPipe wasm runtime |
| `pose_landmarker_lite.task` | 5.5 MB | 33-point pose (default) |
| `pose_landmarker_full.task` | 9 MB | higher-accuracy pose (optional) |
| `selfie_segmenter.tflite` | 0.25 MB | person segmentation |

No third-party CDN is contacted at runtime after this step.

## Testing

```bash
npm test              # run once (77 tests)
npm run test:watch    # watch mode
npm run test:ui       # vitest UI
npm run test:coverage # coverage report
```

Coverage map:

| Suite | What it verifies |
|---|---|
| `utils/smoothing.test.ts` | exponential/vector/Kalman/moving-average math, angle wrapping |
| `utils/geometry.test.ts` | affine triangle maps (identity, rotation, degenerate), bilinear quads |
| `clothing/ClothingEngine.test.ts` | warp centering, shoulder-span scaling, rotation, bend shear, sleeve tracking, visibility gates |
| `clothing/classifier.test.ts` · `anchorDetection` cases | silhouette category + anchor extraction |
| `clothing/backgroundRemoval.test.ts` | flood-fill containment, white/colored backdrops, transparency passthrough |
| `occlusion/OcclusionEngine.test.ts` | z-gating, head capsule, point-in-capsule |
| `clothing/garmentProcessorWorker.test.ts` | worker ↔ inline processing parity, main-thread non-blocking |
| `i18n/*` | locale integrity |

The debug performance panel doubles as a manual perf harness
(docs/PERFORMANCE.md has methodology).

## Project structure

```
src/
├── camera/ pose/ segmentation/ clothing/ occlusion/ rendering/ physics/
├── workers/          # garment pre-processing worker
├── hooks/            # useVirtualTryOn — pipeline orchestrator
├── components/       # VirtualTryOn, GarmentPanel, DebugPanel, ui atoms
├── services/         # garment catalog (swap for backend)
├── i18n/             # en + hi-IN
├── config/           # env parsing → APP_CONFIG
├── cv/               # shared wasm fileset
├── utils/  types/  test/
docs/                 # ARCHITECTURE, TECHNOLOGY_MAP, PERFORMANCE, API
public/
├── garments/         # sample product silhouettes
└── mediapipe/        # self-hosted models (created by `npm run models`)
```

Further reading: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (module map,
data flow, threading, extension seams), [docs/API.md](docs/API.md) (engine
APIs), [docs/TECHNOLOGY_MAP.md](docs/TECHNOLOGY_MAP.md) (what is ML vs CV),
[docs/PERFORMANCE.md](docs/PERFORMANCE.md) (budgets and benchmarks).

## Future improvements

- **Generative try-on** — the pipeline's pose/segmentation/garment outputs are
  exactly the conditioning inputs an img2img or diffusion-based try-on model
  needs; the warp+render stage is the swap point (seam documented in
  TECHNOLOGY_MAP.md). The deterministic pipeline remains as fallback and as
  the pre-processor that crops and poses inputs for the model.
- Learned garment classifier and ML garment matting (drop-in replacements).
- Pants, dresses, sarees, accessories — new anchor sets + warp regions.
- Product URL import, wardrobe, size estimation, side-by-side compare.
- Canvas `captureStream()` video recording; WebGPU render path.

## Privacy

Camera frames are processed in-browser and never transmitted. Garment uploads
are read locally via object URLs; nothing is persisted, and nothing about the
session is logged anywhere beyond the dev console in debug builds. Screenshots
(`Capture photo`) are generated locally and only saved when you click
Download.
