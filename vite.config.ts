import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The tasks-vision bundle is CommonJS-flavored; let Vite pre-bundle it.
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  // Large binary assets served from public/ are included as static assets.
  assetsInclude: [/\.task$/, /\.tflite$/],
})
