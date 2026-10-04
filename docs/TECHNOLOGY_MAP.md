# Technology Map — What Powers What

This project deliberately separates four different layers of "intelligence".
Nothing here claims to be AI-powered merely because a library is imported —
each feature below names the exact technique responsible for it.

| Layer | Definition | Where it appears in this app |
|---|---|---|
| **Computer Vision (deterministic)** | Rule-based image/geometry algorithms with no learned parameters | Garment silhouette analysis, anchor detection, background flood-fill, affine mesh warp, capsule occluders |
| **Machine Learning (pretrained inference)** | Fixed pretrained neural networks executed per frame | `PoseDetector` (pose landmarker), `SegmentationEngine` (selfie segmenter) |
| **Generative AI** | Models that synthesize new pixels | **Not used.** Architecture reserves a seam for it (see below) |
| **Traditional Image Processing** | Pixel/alpha manipulation | Feathering, alpha-mask construction, texture preparation |

## Feature-by-feature attribution

| Feature | Technique | Module | Learned parameters? |
|---|---|---|---|
| Camera capture / switching | WebRTC `getUserMedia` | `src/camera/CameraManager.ts` | No |
| 33-point body tracking | MediaPipe PoseLandmarker (BLAZEPOSE family, pretrained, VIDEO mode, GPU delegate) | `src/pose/PoseDetector.ts` | **Yes (pretrained)** |
| Landmark stabilization | Exponential smoothing with momentum, per-landmark | `src/utils/smoothing.ts`, `src/pose/poseGeometry.ts` | No |
| Detection dropout bridging | Pose coasting (time-boxed reuse of last confident pose) | `src/hooks/useVirtualTryOn.ts` | No |
| Person/background mask | MediaPipe ImageSegmenter (selfie segmenter, pretrained) | `src/segmentation/SegmentationEngine.ts` | **Yes (pretrained)** |
| Garment background removal | Border-seeded flood fill on color similarity + luma threshold + alpha feathering | `src/clothing/backgroundRemoval.ts` | No |
| Garment category (tee/shirt/jacket/top/kurti) | Alpha-silhouette heuristics: aspect ratio, sleeve-lobe mass, collar notch | `src/clothing/classifier.ts` | No |
| Garment anchor points (shoulders, sleeve tips/bottoms, hem) | Row-extent scan of the alpha mask | `src/clothing/anchorDetection.ts` | No |
| Body-anchored garment warp | Bilinear re-projection of an anchor-space mesh onto the torso frame (position, scale, rotation, bend, shear) + sleeve chains onto shoulder→elbow→wrist | `src/clothing/ClothingEngine.ts` | No |
| Occlusion (hands/forearms/head in front) | Z-depth test of arm landmarks vs torso plane (Kalman-filtered), capsule subtraction via canvas `destination-out` | `src/occlusion/OcclusionEngine.ts`, `src/rendering/Renderer.ts` | No |
| Rendering | Canvas2D with per-triangle affine texture maps (GPU raster path); worker offloads garment pre-processing | `src/rendering/Renderer.ts`, `src/workers/garmentProcessor.worker.ts` | No |
| Cloth physics (optional) | Verlet particle provider interface; `NoopClothPhysicsProvider` default | `src/physics/*` | No |

## Honest limitations of the non-ML parts

- **Category classification** is a silhouette heuristic. A striped dress and a
  kurti with the same outline classify the same. A learned classifier can be
  dropped into `classifier.ts` without touching callers.
- **Background removal** works on uniform/studio backdrops. Complex scenes
  require an ML segmenter — the module accepts any injected config and can be
  swapped for a U²-Net/ModNet ONNX pass.
- **Occlusion** uses pose z-depth, which is coarse (arms behind the back are
  sometimes judged "in front"). The segmentation mask can refine this later.

## Reserved seam for generative try-on

The pipeline is deliberately shaped so a generative model can replace the
warp+render stage without redesign:

```
PoseDetector ─┐
              ├─► [ today: ClothingEngine warp → Renderer ]
Segmenter   ──┤
              └─► [ future: img2img/diffusion endpoint or WebGPU model ]
Garment    ───┘
```

A `TryOnRenderer` interface (render frame given pose + garment + mask) is the
swap point; the deterministic pipeline remains as fallback and as the
pre-processor that crops/poses the input for the generative model.
