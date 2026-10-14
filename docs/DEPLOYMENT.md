# Production Deployment Guide

This guide covers deployment procedures for both the client-side React SPA and the FastAPI Python microservice.

---

## 1. Prerequisites & Production Constraints

> **CRITICAL BROWSER REQUIREMENT:**  
> The W3C `navigator.mediaDevices.getUserMedia` API **strictly requires a Secure Context (HTTPS or localhost)**. In production, camera access will fail immediately if served over unencrypted HTTP.

---

## 2. Frontend Deployment (React + Vite SPA)

### A. Static Host (Vercel, Netlify, or Cloudflare Pages)

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables**:
   ```ini
   VITE_BACKEND_API_URL=https://api.yourdomain.com
   VITE_MEDIAPIPE_CDN=/mediapipe
   VITE_TARGET_FPS=30
   VITE_POSE_DELEGATE_GPU=true
   ```

4. **Single Page Application Routing (SPA Fallback)**:
   For Vercel (`vercel.json`):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   For Netlify (`_redirects` in `public/`):
   ```text
   /*    /index.html   200
   ```

### B. Docker + Nginx Containerization

```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx with Brotli/Gzip and Security Headers
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Sample `nginx.conf`:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self)" always;

    # Cache static assets (.js, .css, .wasm, .task)
    location ~* \.(?:wasm|task|svg|png|jpg|jpeg|webp|js|css)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 3. Backend Deployment (Python FastAPI Microservice)

The backend provides SSRF-safe URL scraping and asynchronous try-on job management.

### Dockerfile for FastAPI Backend

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Prevent Python from writing .pyc and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/

EXPOSE 8000

# Run with production Uvicorn worker
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

`backend/requirements.txt`:
```text
fastapi>=0.115.0
pydantic>=2.10.0
uvicorn[standard]>=0.32.0
httpx>=0.28.0
pytest>=8.3.0
```

---

## 4. MediaPipe Model Files Setup

MediaPipe Tasks Vision requires WASM binaries and model `.task` assets:
- `pose_landmarker_lite.task` (5.5 MB)
- `pose_landmarker_full.task` (9.0 MB)
- `selfie_segmenter.tflite` (250 KB)
- `vision_wasm_internal.wasm` & `.js`

Run the model downloader script to populate `public/mediapipe/`:
```bash
node scripts/download-models.mjs
```

In production, these files should be placed behind a CDN with `Content-Type: application/wasm` and CORS headers (`Access-Control-Allow-Origin: *`).
