# AI Fashion Mirror

> **"Try Clothes. See Yourself. Shop Smarter."**

AI Fashion Mirror is a production-quality, multi-modal virtual fashion try-on platform. It combines real-time on-device computer vision body tracking, bilinear geometric cloth mesh warping, automated background segmentation, and an asynchronous generative AI try-on adapter with an SSRF-safe Python FastAPI backend.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            THREE PRIMARY INPUT MODES                         │
├───────────────────────┬───────────────────────────┬──────────────────────────┤
│    A. LIVE CAMERA     │     B. PERSONAL PHOTO     │    C. PRODUCT URL        │
│ Real-time 30+ FPS     │ User portrait upload      │ SSRF-safe link extractor │
│ MediaPipe 33-landmark │ JPG/PNG/WebP validation   │ Amazon, Myntra, Ajio,    │
│ body-anchored drape   │ Mesh warp or GenAI VTON   │ Zara, Uniqlo, Shopify    │
└───────────────────────┴───────────────────────────┴──────────────────────────┘
```

---

## 1. Core Capabilities & Input Methods

### A. Live Camera Try-On
- **Real-Time Body Landmark Tracking**: Uses MediaPipe Tasks-Vision `PoseLandmarker` (33 landmarks, VIDEO running mode, WebGL GPU delegate).
- **Body-Anchored Cloth Mesh Warping**: Bilinear torso deformation mapping shoulders, chest, and hips; dual-chain sleeve warp mapping shoulder → elbow → wrist.
- **Occlusion Punching**: Hands and forearms punching through clothing (`destination-out`) so arms can be raised in front of the chest without unnatural overlap.
- **Tracking Stability**: Landmark exponential smoothing (`alpha = 0.35`) and coasting filter preventing jitter during brief detection dropouts.
- **Camera Controls**: Front/rear switching, fullscreen toggle, screenshot capture, reset, and developer performance panel (measuring FPS, inference latency, confidence).

### B. Personal Photo Try-On
- **Supported Formats**: JPG, JPEG, PNG, and WebP with strict file size (<10MB) and aspect validation.
- **Instant Model Presets**: Includes studio model portrait presets for instant try-on without camera access.
- **Dual Inference Engines**:
  1. *Client-Side High-Res Mesh Warp*: Fast, 100% on-device HTML5 Canvas geometric warp with shadow and lighting blending.
  2. *Cloud Generative AI Adapter*: Asynchronous job pipeline (`validateInputs` → `generateTryOn` → `getJobStatus` → `retrieveResult`).
- **Interactive Results**: Drag-and-drop comparison slider (before vs. after), high-res PNG download, and look saving.

### C. Shopping Product URL Import
- **Supported Retailers**: Myntra, Amazon, Ajio, Zara, Uniqlo, Shopify, and generic OpenGraph / Schema.org stores.
- **Enterprise SSRF Protection**:
  - Rejects `localhost`, `127.0.0.1`, `0.0.0.0`, and RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Rejects cloud instance metadata service (`169.254.169.254`).
  - Resolves hostnames to verify that IP targets are public before fetching.
- **Metadata Extraction**: Extracts product title, brand, price in INR, and image candidates.
- **Fallback Resilience**: Provides manual product image upload when anti-bot or CORS blocks scraping.

---

## 2. Complete 12 Application Pages

| # | Page | Route | Description |
|---|---|---|---|
| 1 | **Splash / Welcome** | `#/welcome` | Hero introduction, logo, tagline, and quick entry points. |
| 2 | **Home Dashboard** | `#/home` | Quick actions, popular categories, featured garments, and saved looks. |
| 3 | **Live Camera Try-On** | `#/live` | Real-time camera stage, tracking status pill, controls, and garment selector. |
| 4 | **Photo Upload** | `#/photo-upload` | Drag-and-drop user photo upload, model presets, and try-on synthesis. |
| 5 | **Product URL Import** | `#/product-url` | Shopping URL import, SSRF validator, candidate selection, manual fallback. |
| 6 | **Clothing Gallery** | `#/gallery` | Categorized garments (Tees, Shirts, Jackets, Tops, Kurtis, Dresses) with search. |
| 7 | **Product Details** | `#/product-details?id=...` | High-res view, color swatches, sizes, specifications, and store link. |
| 8 | **Virtual Try-On Results** | `#/results` | Interactive before/after slider, download, save look, and simulation disclaimer. |
| 9 | **Style & Comparison** | `#/compare` | Side-by-side comparison of 2–4 outfits with style guidance notes. |
| 10 | **Saved Looks Gallery** | `#/saved` | Grid of saved try-on looks, favorite filter, inspection modal, and deletion. |
| 11 | **User Profile** | `#/profile` | Account name, try-on statistics, privacy controls, and JSON data export. |
| 12 | **Settings & Privacy** | `#/settings` | Camera resolution, smoothing factor, AI mode, hardware diagnostics, cache purge. |

---

## 3. Technology Architecture

```
Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
  ├─ Camera Manager (getUserMedia + WebGL texture)
  ├─ Pose Detector (MediaPipe Tasks-Vision 33-point PoseLandmarker)
  ├─ Clothing Engine (Background removal + bilinear mesh warp)
  ├─ Occlusion Engine (Geometric capsule depth punching)
  ├─ Storage Service (Local privacy-first persistence & GDPR export)
  └─ Virtual Try-On Service (Async job lifecycle manager)

Backend (Python 3.12 + FastAPI + Pydantic v2)
  ├─ SSRF Security Validator (Private IP filtering & DNS resolution verification)
  ├─ Product Extractor (OpenGraph, Twitter Cards, Schema.org JSON-LD parser)
  └─ Virtual Try-On API (Async job store, polling & external GenAI adapter)
```

---

## 4. Setup & Running Instructions

### Prerequisites
- **Node.js** >= 18.0.0
- **Python** >= 3.10
- Modern browser with WebGL support (Chrome, Edge, Firefox, Safari)

### Frontend Setup
```bash
# 1. Install dependencies
npm install

# 2. Download offline MediaPipe models (pose & segmenter)
npm run models

# 3. Start development server
npm run dev
# Running at http://localhost:5173
```

### Backend Setup (FastAPI Microservice)
```bash
# 1. Start FastAPI backend with Uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# API running at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

---

## 5. Verification & Testing

Both frontend and backend test suites are fully automated:

### Run Frontend Vitest Suite
```bash
npm test
# Runs 14 test files with 91 unit and integration tests
```

### Run Backend Pytest Suite
```bash
python -m pytest backend/tests
# Runs 9 backend tests covering SSRF safety, product extraction, and try-on jobs
```

### Build for Production
```bash
npm run build
# Produces optimized production bundle in dist/
```

---

## 6. Performance & Computer Vision Benchmarks

Measured on standard hardware (Intel i7 / Apple M-series, 1080p camera):

| Metric | Target | Measured Result |
|---|---|---|
| **Render Frame Rate** | 30 FPS | 48–60 FPS |
| **Pose Inference Latency** | < 35 ms | 18–26 ms (WebGL GPU) |
| **Garment Processing (Worker)** | < 150 ms | 68–95 ms |
| **Photo Try-On Synthesis** | < 1500 ms | 600–900 ms |
| **JS Heap Memory Allocation** | < 120 MB | ~54 MB stable |

---

## 7. Security & Privacy Guarantees

1. **Local Frame Processing**: Camera video frames never leave your browser. All pose detection and canvas drawing occur on-device.
2. **SSRF Hardening**: The URL extraction endpoint strictly blocks private subnets (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 loopbacks, and non-HTTP protocols).
3. **Data Sovereignty**: Saved looks and preferences remain in browser `localStorage`. Users can export all data via JSON or purge all records with a single click.

---

## 8. Known Limitations & Roadmap

- **Difficult Poses**: Extreme profile views (>80° side turn) and arms crossed tightly against the torso have reduced landmark confidence. In such cases, the system engages the coasting filter.
- **Lower Torso Garments**: Current mesh warp model targets upper body garments (tees, shirts, jackets, tops, kurtis, dresses). Pants and footwear tracking are planned for v2.
- **External Diffusion Models**: When cloud generative diffusion models (e.g., IDM-VTON) are enabled, inference requires external GPU compute (10–15 seconds per job). The client-side geometric engine serves as the instantaneous fallback.
