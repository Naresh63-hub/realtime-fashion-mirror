import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Cpu,
  Layers,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
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
    toast.success('Settings and preferences saved successfully!');
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
    toast.success('Hardware diagnostics scan completed.');
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    toast.info('Temporary session cache cleared.');
  };

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="aura-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Settings className="h-3 w-3" />
            <span>STUDIO CONFIG</span>
          </span>
          <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            SECURITY & PREFERENCES
          </span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Settings & Privacy Controls
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
          Configure real-time landmark tracking tolerances, inference engines, hardware delegates, and private storage policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Camera Preferences */}
        <div className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Camera & Real-Time Tracking
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-mono text-xs font-semibold text-slate-300 mb-2">Target Camera Resolution</label>
              <select
                value={res}
                onChange={(e) => setRes(e.target.value as '720p' | '1080p')}
                className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f18] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              >
                <option value="720p">720p HD (1280x720) - Optimal 30-60 FPS</option>
                <option value="1080p">1080p Full HD (1920x1080) - High Quality</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
              <div>
                <p className="font-display text-xs font-semibold text-white">Mirror User Camera</p>
                <p className="text-[11px] text-slate-400">Natural mirror reflection for selfie cam</p>
              </div>
              <input
                type="checkbox"
                checked={mirror}
                onChange={(e) => setMirror(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-mono text-[11px]">Landmark Smoothing Factor</span>
                <span className="font-mono font-bold text-indigo-400">{smoothing}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={smoothing}
                onChange={(e) => setSmoothing(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Higher = smoother drape; Lower = faster snap</p>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-mono text-[11px]">Torso Confidence Threshold</span>
                <span className="font-mono font-bold text-indigo-400">{confidence}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Minimum visibility score to lock garment mesh</p>
            </div>
          </div>
        </div>

        {/* AI & Computer Vision Inference Engines */}
        <div className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
            <Cpu className="h-4 w-4 text-fuchsia-400" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Virtual Try-On Inference Engine
            </h2>
          </div>

          <div className="space-y-3">
            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
              mode === 'client-high-res'
                ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                : 'border-white/[0.08] bg-black/40 hover:border-indigo-400/40'
            }`}>
              <input
                type="radio"
                name="engine"
                checked={mode === 'client-high-res'}
                onChange={() => setMode('client-high-res')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-display text-xs font-bold text-white">Client-Side High-Res Mesh Warp Engine (Default & Local)</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  100% on-device MediaPipe body tracking & bilinear geometric cloth warp. Zero server latency, instant processing, complete privacy.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
              mode === 'cloud-genai'
                ? 'border-fuchsia-500 bg-fuchsia-600/15 ring-1 ring-fuchsia-500/30'
                : 'border-white/[0.08] bg-black/40 hover:border-fuchsia-400/40'
            }`}>
              <input
                type="radio"
                name="engine"
                checked={mode === 'cloud-genai'}
                onChange={() => setMode('cloud-genai')}
                className="mt-1 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <div>
                <p className="font-display text-xs font-bold text-white">Cloud Generative AI Adapter (IDM-VTON / FastAPI Backend)</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Submits asynchronous jobs to configured remote GPU diffusion endpoint or local FastAPI server.
                </p>
              </div>
            </label>
          </div>

          {mode === 'cloud-genai' && (
            <div className="pt-2">
              <label className="block font-mono text-xs font-semibold text-slate-300 mb-2">Custom Cloud API Endpoint URL</label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000/api/tryon/jobs or https://your-vton-api..."
                className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          )}
        </div>

        {/* Storage & Privacy Policies */}
        <div className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Local Storage & Cache Controls
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClearCache}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition backdrop-blur-md"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
              <span>Clear Session Cache</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete all saved try-on looks?')) {
                  StorageService.getSavedLooks().forEach((l) => StorageService.deleteLook(l.id));
                  toast.success('Saved looks cleared.');
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Saved Library</span>
            </button>
          </div>
        </div>

        {/* Diagnostics & Model Version */}
        <div className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                System Diagnostics & Model Specs
              </h2>
            </div>
            <button
              type="button"
              onClick={runDiagnostics}
              className="aura-pill bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs transition"
            >
              Run Hardware Check
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
              <span className="font-mono text-slate-400 block text-[10px]">POSE MODEL</span>
              <span className="font-semibold text-white">BlazePose 33-pt</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
              <span className="font-mono text-slate-400 block text-[10px]">WASM RUNTIME</span>
              <span className="font-semibold text-white">SIMD + Fallback</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
              <span className="font-mono text-slate-400 block text-[10px]">GPU DELEGATE</span>
              <span className="font-semibold text-white">WebGL2 Accelerated</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5">
              <span className="font-mono text-slate-400 block text-[10px]">STUDIO ENGINE</span>
              <span className="font-semibold text-white">AURA PROD v2.0</span>
            </div>
          </div>

          {diagResult.tested && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs space-y-1.5 backdrop-blur-md">
              <p className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Hardware Diagnostic Verification:</span>
              </p>
              <p className={diagResult.webgl ? 'text-emerald-400' : 'text-rose-400'}>
                • WebGL GPU Pipeline: {diagResult.webgl ? 'Active & Accelerated' : 'Not Available'}
              </p>
              <p className={diagResult.worker ? 'text-emerald-400' : 'text-rose-400'}>
                • Background Web Workers: {diagResult.worker ? 'Supported' : 'Not Available'}
              </p>
              <p className={diagResult.wasm ? 'text-emerald-400' : 'text-rose-400'}>
                • WebAssembly Core: {diagResult.wasm ? 'Supported' : 'Not Available'}
              </p>
            </div>
          )}
        </div>

        {/* Save Form button */}
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-8 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
        >
          Save All Preferences
        </button>
      </form>
    </div>
  );
};
