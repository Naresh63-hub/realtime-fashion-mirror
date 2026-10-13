import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';

export const SettingsPrivacyPage: React.FC = () => {
  const { preferences, updatePreferences } = useApp();

  const [res, setRes] = useState(preferences.cameraResolution);
  const [mirror, setMirror] = useState(preferences.mirrorUserCamera);
  const [smoothing, setSmoothing] = useState(preferences.smoothingFactor);
  const [confidence, setConfidence] = useState(preferences.confidenceThreshold);
  const [mode, setMode] = useState(preferences.inferenceMode);
  const [apiUrl, setApiUrl] = useState(preferences.cloudVtonApiUrl || '');
  const [storagePref, setStoragePref] = useState(preferences.storagePreference);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Diagnostics check state
  const [diagResult, setDiagResult] = useState<{
    webgl: boolean;
    worker: boolean;
    wasm: boolean;
    tested: boolean;
  }>({ webgl: false, worker: false, wasm: false, tested: false });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      cameraResolution: res,
      mirrorUserCamera: mirror,
      smoothingFactor: smoothing,
      confidenceThreshold: confidence,
      inferenceMode: mode,
      cloudVtonApiUrl: apiUrl,
      storagePreference: storagePref,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const runDiagnostics = () => {
    const webglSupported = (() => {
      try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl') || c.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    })();

    const workerSupported = typeof Worker !== 'undefined';
    const wasmSupported = typeof WebAssembly !== 'undefined';

    setDiagResult({
      webgl: webglSupported,
      worker: workerSupported,
      wasm: wasmSupported,
      tested: true,
    });
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    alert('Temporary cache cleared successfully.');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>⚙️</span>
          <span>Settings & Privacy Controls</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Configure camera tracking algorithms, inference pipelines, and private storage behavior.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300">
          ✓ Settings saved and applied across all modules.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Camera Preferences */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
            📹 Camera & Real-Time Tracking
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Target Camera Resolution</label>
              <select
                value={res}
                onChange={(e) => setRes(e.target.value as '720p' | '1080p')}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="720p">720p HD (1280x720) - Optimal 30-60 FPS</option>
                <option value="1080p">1080p Full HD (1920x1080) - High Quality</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-4 sm:pt-6">
              <div>
                <p className="text-xs font-semibold text-white">Mirror User Camera</p>
                <p className="text-[11px] text-gray-400">Natural mirror reflection for selfie cam</p>
              </div>
              <input
                type="checkbox"
                checked={mirror}
                onChange={(e) => setMirror(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 text-violet-600 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Landmark Smoothing Factor</span>
                <span className="font-semibold text-white">{smoothing}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={smoothing}
                onChange={(e) => setSmoothing(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Higher = smoother drape; Lower = faster snap</p>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Torso Confidence Threshold</span>
                <span className="font-semibold text-white">{confidence}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Minimum visibility score to lock garment mesh</p>
            </div>
          </div>
        </div>

        {/* AI & Computer Vision Inference Engines */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
            🧠 Virtual Try-On Inference Engine
          </h2>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 cursor-pointer hover:border-violet-500/40">
              <input
                type="radio"
                name="engine"
                checked={mode === 'client-high-res'}
                onChange={() => setMode('client-high-res')}
                className="mt-1 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <p className="text-xs font-bold text-white">Client-Side High-Res Mesh Warp Engine (Default & On-Device)</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  100% on-device MediaPipe body tracking & bilinear geometric cloth warp. Zero server latency, instant processing, complete privacy.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 cursor-pointer hover:border-violet-500/40">
              <input
                type="radio"
                name="engine"
                checked={mode === 'cloud-genai'}
                onChange={() => setMode('cloud-genai')}
                className="mt-1 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <p className="text-xs font-bold text-white">Cloud Generative AI Adapter (IDM-VTON / FastAPI Backend)</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Submits asynchronous jobs to a configured remote GPU diffusion endpoint or local FastAPI server.
                </p>
              </div>
            </label>
          </div>

          {mode === 'cloud-genai' && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Custom Cloud API Endpoint URL</label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000/api/tryon/jobs or https://your-vton-api..."
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Storage & Privacy Policies */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
            🔒 Local Storage & Cache Controls
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClearCache}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
            >
              Clear Temporary Cache
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete all saved try-on looks?')) {
                  StorageService.getSavedLooks().forEach((l) => StorageService.deleteLook(l.id));
                  alert('Saved looks cleared.');
                }
              }}
              className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
            >
              Clear Saved Images
            </button>
          </div>
        </div>

        {/* Diagnostics & Model Version */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              🛠️ System Diagnostics & Model Specs
            </h2>
            <button
              type="button"
              onClick={runDiagnostics}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              Run Hardware Check
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-white/5 bg-black/40 p-3">
              <span className="text-gray-400 block text-[10px]">Pose Model</span>
              <span className="font-semibold text-white">MediaPipe BlazePose 33</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/40 p-3">
              <span className="text-gray-400 block text-[10px]">WASM Runtime</span>
              <span className="font-semibold text-white">SIMD + No-SIMD Fallback</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/40 p-3">
              <span className="text-gray-400 block text-[10px]">Hardware Delegate</span>
              <span className="font-semibold text-white">WebGL GPU Accelerated</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/40 p-3">
              <span className="text-gray-400 block text-[10px]">App Version</span>
              <span className="font-semibold text-white">v1.0.0 Production</span>
            </div>
          </div>

          {diagResult.tested && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-4 text-xs space-y-1">
              <p className="font-bold text-white">Hardware Diagnostic Results:</p>
              <p className={diagResult.webgl ? 'text-emerald-400' : 'text-red-400'}>
                • WebGL GPU Pipeline: {diagResult.webgl ? '✓ Supported & Active' : '✕ Not Available'}
              </p>
              <p className={diagResult.worker ? 'text-emerald-400' : 'text-red-400'}>
                • Background Web Workers: {diagResult.worker ? '✓ Supported' : '✕ Not Available'}
              </p>
              <p className={diagResult.wasm ? 'text-emerald-400' : 'text-red-400'}>
                • WebAssembly Core: {diagResult.wasm ? '✓ Supported' : '✕ Not Available'}
              </p>
            </div>
          )}
        </div>

        {/* Save Form button */}
        <button
          type="submit"
          className="rounded-2xl bg-violet-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition"
        >
          Save All Preferences
        </button>
      </form>
    </div>
  );
};
