# AI Virtual Fashion — Production Deployment Guide

This guide provides step-by-step instructions for deploying the **AI Virtual Fashion** web application:
- **Frontend** $\to$ **Vercel** (React 19 + TypeScript + Vite)
- **Backend** $\to$ **Render Web Service** (FastAPI + Python 3)
- **AI Inference** $\to$ **Replicate** (IDM-VTON Generative Diffusion Model)
- **Source Code** $\to$ **GitHub** (`Naresh63-hub/realtime-fashion-mirror`)

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │            User Browser              │
                      │    (Mobile / Desktop with Camera)    │
                      └──────────────┬───────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ HTTPS                                 │ HTTPS (API)
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │     Vercel Frontend     │             │   Render Web Service    │
    │  (React 19 / Vite SPA)  │             │   (FastAPI Backend)     │
    │  - MediaPipe on-device  │             │  - SSRF-safe extraction │
    │  - 0s Canvas deformation│             │  - Asynchronous jobs    │
    │  - HashRouter routing   │             │  - Concurrency guards   │
    └─────────────────────────┘             └────────────┬────────────┘
                                                         │
                                                         │ HTTPS (Bearer Auth)
                                                         ▼
                                            ┌─────────────────────────┐
                                            │   Replicate IDM-VTON    │
                                            │ (Cloud Diffusion Model) │
                                            └─────────────────────────┘
```

---

## Deployment Sequence

Follow this order so each service has the URL it depends on:

1. **Deploy Backend to Render** $\to$ Obtain Render Backend URL (`https://<service-name>.onrender.com`).
2. **Deploy Frontend to Vercel** $\to$ Provide Render URL as `VITE_API_BASE_URL` $\to$ Obtain Vercel URL (`https://<app-name>.vercel.app`).
3. **Authorize Vercel in Render CORS** $\to$ Set `FRONTEND_URL` in Render to match your Vercel domain.
4. **Run End-to-End Production Verification Checklist**.

---

## Step 1: Deploy Backend to Render (Web Service)

### 1. Create a New Web Service
1. Log in to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** $\to$ **Web Service**.
3. Select **Build and deploy from a Git repository**.
4. Connect the repository: `Naresh63-hub/realtime-fashion-mirror`.
5. Branch: `main`.

### 2. Configure Service Settings
| Setting | Value |
| :--- | :--- |
| **Name** | `ai-virtual-fashion-backend` *(or your preferred name)* |
| **Region** | Select nearest to your users (e.g. `Frankfurt`, `Oregon`, `Singapore`) |
| **Branch** | `main` |
| **Root Directory** | Leave empty *(defaults to repo root)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| **Plan Type** | `Free` or `Starter` |

### 3. Configure Health Check Path
In **Advanced Settings** $\to$ **Health Check Path**:
```
/health
```
*(Both `/health` and `/api/health` return HTTP 200 `{"status": "ok"}`).*

### 4. Set Render Environment Variables
Add the following key-value pairs under **Environment Variables**:

| Variable Key | Required / Optional | Description & Example Value |
| :--- | :--- | :--- |
| `FRONTEND_URL` | **Required** | `https://your-fashion-mirror.vercel.app` *(set to `http://localhost:5173` initially, then update after Vercel deploy)* |
| `CORS_ALLOWED_ORIGINS` | Optional | Additional allowed origins: `https://your-fashion-mirror.vercel.app` |
| `VTON_API_KEY` | **Required for AI** | Your Replicate token: `r8_...` *(from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))* |
| `VTON_PROVIDER` | Optional | `replicate` *(default)* |
| `VTON_API_URL` | Optional | `https://api.replicate.com/v1/predictions` *(default)* |
| `VTON_MODEL_VERSION` | Optional | `c871bb9b046607b680449ecbae55fd8c6d8bc1a2b1d981d76326496738469db1` *(IDM-VTON)* |
| `ENFORCE_HTTPS_SSRF` | Optional | `false` *(or `true` to enforce HTTPS for all product URLs)* |

> [!CAUTION]
> **Keep `VTON_API_KEY` strictly inside Render Environment Variables.** Never commit `.env` or paste tokens into client-side code.

### 5. Deploy & Verify Backend
Click **Create Web Service**. Wait for the build and deployment to complete.
Verify your backend by opening in your browser:
```
https://<your-service-name>.onrender.com/health
```
Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "service": "AI Fashion Mirror Backend",
  "features": [
    "ssrf_protection",
    "shopping_url_extraction",
    "virtual_tryon_jobs",
    "client_high_res_mesh_warp",
    "cloud_genai_adapter"
  ]
}
```

Copy your Render backend URL (e.g. `https://ai-virtual-fashion-backend.onrender.com`).

---

## Step 2: Deploy Frontend to Vercel

### 1. Import Repository
1. Log in to [vercel.com](https://vercel.com/).
2. Click **Add New...** $\to$ **Project**.
3. Select your GitHub repository: `Naresh63-hub/realtime-fashion-mirror`.

### 2. Configure Build & Output Settings
Vercel automatically detects the Vite framework:
| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 3. Set Vercel Environment Variables
Under **Environment Variables**, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://ai-virtual-fashion-backend.onrender.com` | **Your Render backend URL without trailing slash** |
| `VITE_VTON_INFERENCE_MODE` | `client-high-res` | Default try-on mode (`client-high-res` for instant canvas, or `cloud-genai` for cloud diffusion) |

> [!IMPORTANT]
> **Do NOT add `VTON_API_KEY` to Vercel.** All generative AI API credentials belong exclusively on the Render backend.

### 4. Deploy & Obtain Vercel URL
Click **Deploy**. Deployment takes approximately 1 minute.
Once finished, Vercel gives you your production URL:
```
https://realtime-fashion-mirror.vercel.app
```

---

## Step 3: Authorize Vercel in Render CORS

1. Go back to [dashboard.render.com](https://dashboard.render.com/) $\to$ select your `ai-virtual-fashion-backend` service.
2. Go to **Environment**.
3. Update `FRONTEND_URL` to match your real Vercel production URL:
   ```env
   FRONTEND_URL=https://realtime-fashion-mirror.vercel.app
   ```
4. Click **Save Changes**. Render will automatically redeploy with the updated CORS configuration in seconds.

---

## Step 4: Production Verification Checklist

Run through these verification tests on your live deployment:

- [ ] **Root Health Check**:
  - Visit `https://<render-backend-url>/health` $\to$ returns HTTP 200 `{"status": "ok"}`.
  - Visit `https://<render-backend-url>/api/tryon/config` $\to$ returns configuration status.
- [ ] **Vercel SPA Routing & Refresh**:
  - Visit `https://<vercel-url>/` $\to$ landing page loads.
  - Refresh the page on `/#/photo-upload` and `/#/live` $\to$ renders without 404s.
- [ ] **Camera Permissions Over HTTPS**:
  - Open `/#/live` on desktop and mobile $\to$ browser requests camera permission over secure HTTPS.
  - MediaPipe pose landmarks and cloth deformation overlay start at ~30 FPS.
- [ ] **Shopping URL Extraction**:
  - Go to `/#/product-url` or `/#/photo-upload`.
  - Paste a supported store URL (e.g. Myntra, Amazon, Zara, AJIO, H&M, or Uniqlo).
  - Verify product title, price, and multiple garment image angles are retrieved.
- [ ] **Garment Angle Selection**:
  - In `/#/photo-upload`, click among the extracted image thumbnails.
  - Verify the active selection updates immediately.
- [ ] **Virtual Try-On Execution**:
  - Upload a personal photograph.
  - Run Virtual Try-On:
    - **Instant Canvas Mode**: Generates localized draped image in < 1 second.
    - **Cloud GenAI Mode**: Submits job to Render backend $\to$ Replicate IDM-VTON $\to$ polling updates progress $\to$ final photoreal image displayed in results.
- [ ] **Fit Studio & Export**:
  - In `/#/results`, adjust vertical offset, scale, and silhouette sliders.
  - Click **Download Result Image** $\to$ PNG saves to device.
  - Click **Save Look to Gallery** $\to$ look appears in `/#/saved`.
- [ ] **Live Mirror Handoff**:
  - On the results page or photo upload page, click **"Try this Garment in Live Camera"**.
  - Verify that `LiveCameraPage` automatically binds the chosen garment to the camera session.

---

## Local Development Commands

To run the application locally:

```powershell
# 1. Run FastAPI Backend (Terminal 1)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Run React Vite Frontend (Terminal 2)
npm run dev
# Running at http://localhost:5173

# 3. Run Backend Pytest Suite
python -m pytest backend/tests -o pythonpath=.

# 4. Run Frontend Vitest Suite
npx vitest run

# 5. Type-check & Production Build
npm run type-check
npm run build
```
