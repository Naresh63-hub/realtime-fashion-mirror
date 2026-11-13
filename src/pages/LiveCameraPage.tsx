import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  VideoOff,
  RefreshCw,
  Maximize2,
  Heart,
  Download,
  Sparkles,
  Sliders,
  X,
  CheckCircle2,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualTryOn } from '../hooks/useVirtualTryOn';
import { GarmentPanel } from '../components/GarmentPanel';
import { DebugPanel } from '../components/DebugPanel';
import { Button, ErrorBanner, Spinner, TrackingPill } from '../components/ui';
import { useTranslation } from '../i18n';
import { useAnnounce } from '../utils/a11yAnnouncer';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { VirtualTryOnService } from '../services/virtualTryOnService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { ClothingCategory, type TryOnJobStatus } from '../types';

export const LiveCameraPage: React.FC = () => {
  const { t } = useTranslation();
  const { announce } = useAnnounce();
  const { selectedGarment, navigate, refreshSavedLooks, setLastResult } = useApp();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedClean, setCapturedClean] = useState<string | null>(null);

  const {
    engineReady,
    initializing,
    cameraActive,
    tracking,
    garment,
    error,
    debugMode,
    metrics,
    availableCameras,
    selectedCameraId,
    startCamera,
    stopCamera,
    switchCamera,
    switchCameraDevice,
    loadGarmentFile,
    loadGarmentUrl,
    removeGarment,
    toggleDebug,
    captureScreenshot,
    captureCleanFrame,
    setError,
    setMaskVisible,
  } = useVirtualTryOn(canvasRef);

  // Sync selected garment from global app context if present
  useEffect(() => {
    if (selectedGarment && engineReady && (!garment || garment.id !== selectedGarment.id)) {
      void loadGarmentUrl(selectedGarment.imageUrl, selectedGarment.name, selectedGarment.id);
    }
  }, [selectedGarment, engineReady]);

  useEffect(() => {
    document.documentElement.dataset.showLandmarks = String(showLandmarks);
  }, [showLandmarks]);

  useEffect(() => {
    if (error) {
      announce(error.message);
      toast.error(error.message);
    }
  }, [error, announce]);

  const handleCapture = useCallback(() => {
    const dataUrl = captureScreenshot();
    const cleanUrl = captureCleanFrame();
    if (dataUrl) {
      setCaptured(dataUrl);
      setCapturedClean(cleanUrl || dataUrl);
      toast.success('Screenshot captured! You can now preview, save or download it.');
    }
  }, [captureScreenshot, captureCleanFrame]);

  const handleDownload = useCallback(() => {
    if (!captured) return;
    const link = document.createElement('a');
    link.download = `tryon-live-${Date.now()}.png`;
    link.href = captured;
    link.click();
    toast.success('Try-on image downloaded to your device.');
  }, [captured]);

  const handleSaveToGallery = useCallback(() => {
    if (!captured) return;
    StorageService.saveLook({
      title: garment?.name ? `Live Look with ${garment.name}` : 'Live Camera Try-On',
      personImageUrl: captured,
      resultImageUrl: captured,
      garmentId: garment?.id || 'live-garment',
      garmentName: garment?.name || 'Selected Garment',
      garmentCategory: garment?.category || ClothingCategory.T_SHIRT,
      garmentImageUrl: garment?.imageUrl || '/garments/tee.svg',
      isFavorite: false,
    });
    refreshSavedLooks();
    toast.success('Look saved to your private gallery!');
  }, [captured, garment, refreshSavedLooks]);

  const [isGeneratingPhotoreal, setIsGeneratingPhotoreal] = useState(false);

  const handleGeneratePhotorealStill = useCallback(async () => {
    if (!captured) return;
    try {
      setIsGeneratingPhotoreal(true);
      toast.loading('✨ Preparing photoreal try-on from live capture...', { id: 'live-photoreal' });
      const currentGarment = garment || (selectedGarment as any) || FULL_PRODUCT_CATALOG[0];

      // Check backend VTON provider readiness
      const cfg = await VirtualTryOnService.getBackendVTONConfig();
      if (!cfg.configured) {
        toast.info(
          'Cloud Generative AI is unconfigured (requires VTON_API_KEY). Rendering Instant Canvas High-Res Still.',
          { id: 'live-photoreal', duration: 4000 }
        );
      }

      const effectiveMode = cfg.configured ? 'cloud-genai' : 'client-high-res';
      const personImageToUse = (effectiveMode === 'cloud-genai' && capturedClean) ? capturedClean : captured;
      const job = await VirtualTryOnService.generateTryOn({
        personImage: personImageToUse,
        garmentImage: currentGarment.imageUrl,
        garmentName: currentGarment.name,
        category: currentGarment.category,
        modelMode: effectiveMode,
      });

      if (job.status === 'failed') {
        throw new Error(job.error || 'Generation failed.');
      }

      let status: TryOnJobStatus = job.status;
      let attempts = 0;
      const maxAttempts = effectiveMode === 'cloud-genai' ? 45 : 15;
      const delay = effectiveMode === 'cloud-genai' ? 1500 : 400;

      while (status !== 'succeeded' && status !== 'failed' && attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, delay));
        const updated = await VirtualTryOnService.getJobStatus(job.id);
        status = updated.status;
        attempts++;
        if (effectiveMode === 'cloud-genai' && updated.progress > 40) {
          toast.loading(`Synthesizing diffusion fabric texture (${updated.progress}%)...`, {
            id: 'live-photoreal',
          });
        }
      }

      if (status === 'succeeded') {
        const result = await VirtualTryOnService.retrieveResult(job.id);
        if (result) {
          result.canvasImageUrl = captured;
          if (effectiveMode === 'cloud-genai') {
            result.aiImageUrl = result.resultImageUrl;
          }
          setLastResult(result);
          toast.success('✨ Photoreal still ready! Routing to Fit Studio...', { id: 'live-photoreal' });
          setCaptured(null);
          navigate('results');
        }
      } else {
        const failedJob = await VirtualTryOnService.getJobStatus(job.id);
        toast.error(failedJob.error || 'Photoreal generation timed out.', { id: 'live-photoreal' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Photoreal still generation failed.';
      toast.error(msg, { id: 'live-photoreal' });
    } finally {
      setIsGeneratingPhotoreal(false);
    }
  }, [captured, garment, selectedGarment, setLastResult, navigate]);

  // ---------------------------------------------------------------------------
  // AI Live Preview (Periodic Frame Sampling + Diffusion Keyframe Synthesis)
  // ---------------------------------------------------------------------------
  const [aiLiveEnabled, setAiLiveEnabled] = useState(false);
  const [aiLiveSessionId, setAiLiveSessionId] = useState<string | null>(null);
  const [aiLiveProcessing, setAiLiveProcessing] = useState(false);
  const [aiLiveProgress, setAiLiveProgress] = useState(0);
  const [aiLiveResultUrl, setAiLiveResultUrl] = useState<string | null>(null);
  const [aiLiveResultGarment, setAiLiveResultGarment] = useState<string | null>(null);
  const [aiLiveError, setAiLiveError] = useState<string | null>(null);
  const [aiLiveConfigured, setAiLiveConfigured] = useState<boolean | null>(null);
  const [aiLiveDroppedCount, setAiLiveDroppedCount] = useState(0);
  const [aiLiveSampledCount, setAiLiveSampledCount] = useState(0);
  const [aiLiveLastSampleTime, setAiLiveLastSampleTime] = useState<number | null>(null);

  const sampleAndSubmitLiveFrame = useCallback(
    async (sessionId: string) => {
      if (!cameraActive) return;
      const currentGarment = garment || (selectedGarment as any) || FULL_PRODUCT_CATALOG[0];
      if (!currentGarment) return;

      // Prefer clean webcam frame (without 2D canvas overlay) for photorealistic AI diffusion
      const frameDataUrl = captureCleanFrame() || captureScreenshot();
      if (!frameDataUrl) return;

      setAiLiveProcessing(true);
      setAiLiveError(null);
      setAiLiveSampledCount((c) => c + 1);
      try {
        const res = await VirtualTryOnService.submitLiveFrame(
          sessionId,
          frameDataUrl,
          currentGarment.imageUrl,
          currentGarment.name,
          currentGarment.category
        );
        if (res.dropped) {
          setAiLiveDroppedCount((prev) => prev + 1);
        } else if (res.status === 'processed' && res.resultImageUrl) {
          setAiLiveResultUrl(res.resultImageUrl);
          setAiLiveResultGarment(currentGarment.name);
          setAiLiveProcessing(false);
          setAiLiveProgress(100);
          setAiLiveLastSampleTime(Date.now());
          toast.success('✨ New AI Live Keyframe synthesized!', { id: 'live-ai-frame' });
        } else if (res.status === 'unconfigured') {
          setAiLiveConfigured(false);
          setAiLiveProcessing(false);
        } else if (res.status === 'failed') {
          setAiLiveProcessing(false);
          setAiLiveError(res.message);
        }
      } catch (err: unknown) {
        setAiLiveProcessing(false);
        setAiLiveError(err instanceof Error ? err.message : 'Live AI frame submission failed');
      }
    },
    [cameraActive, garment, selectedGarment, captureCleanFrame, captureScreenshot]
  );

  // Poll live session status when processing or active
  useEffect(() => {
    if (!aiLiveEnabled || !aiLiveSessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await VirtualTryOnService.getLiveSessionStatus(aiLiveSessionId);
        setAiLiveConfigured(status.aiConfigured);
        setAiLiveProcessing(status.isProcessing);
        if (status.jobProgress > 0) {
          setAiLiveProgress(status.jobProgress);
        }
        setAiLiveDroppedCount(status.framesDropped);
        if (status.lastError) {
          setAiLiveError(status.lastError);
        }
        if (status.latestResultUrl && status.latestResultUrl !== aiLiveResultUrl) {
          setAiLiveResultUrl(status.latestResultUrl);
          setAiLiveResultGarment(status.latestResultGarment || (garment?.name ?? 'Selected Garment'));
          setAiLiveLastSampleTime(Date.now());
          setAiLiveProcessing(false);
          setAiLiveError(null);
        }
      } catch {
        // Polling retry
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [aiLiveEnabled, aiLiveSessionId, aiLiveResultUrl, garment]);

  // Periodic keyframe sampler (every 8 seconds when active and not busy)
  useEffect(() => {
    if (!aiLiveEnabled || !aiLiveSessionId || !cameraActive) return;

    const sampleInterval = setInterval(() => {
      if (!aiLiveProcessing) {
        void sampleAndSubmitLiveFrame(aiLiveSessionId);
      }
    }, 8000);

    return () => clearInterval(sampleInterval);
  }, [aiLiveEnabled, aiLiveSessionId, cameraActive, aiLiveProcessing, sampleAndSubmitLiveFrame]);

  // Garment change handler that safely manages in-flight AI keyframe state
  const handleGarmentSelect = useCallback(
    async (url: string, name: string, id: string) => {
      void loadGarmentUrl(url, name, id);
      toast.success(`Selected garment: ${name}`);
      if (aiLiveEnabled && aiLiveSessionId) {
        // Cancel previous in-flight inference for old garment
        await VirtualTryOnService.cancelLiveSessionInference(aiLiveSessionId);
        setAiLiveProcessing(false);
        setAiLiveError(null);
        // Queue fresh keyframe sample for new garment
        setTimeout(() => {
          void sampleAndSubmitLiveFrame(aiLiveSessionId);
        }, 300);
      }
    },
    [loadGarmentUrl, aiLiveEnabled, aiLiveSessionId, sampleAndSubmitLiveFrame]
  );

  const handleGarmentUpload = useCallback(
    async (file: File) => {
      void loadGarmentFile(file);
      toast.success(`Uploaded garment: ${file.name}`);
      if (aiLiveEnabled && aiLiveSessionId) {
        await VirtualTryOnService.cancelLiveSessionInference(aiLiveSessionId);
        setAiLiveProcessing(false);
        setAiLiveError(null);
        setTimeout(() => {
          void sampleAndSubmitLiveFrame(aiLiveSessionId);
        }, 500);
      }
    },
    [loadGarmentFile, aiLiveEnabled, aiLiveSessionId, sampleAndSubmitLiveFrame]
  );

  const handleGarmentRemove = useCallback(() => {
    removeGarment();
    toast.info('Garment removed.');
    if (aiLiveEnabled && aiLiveSessionId) {
      void VirtualTryOnService.cancelLiveSessionInference(aiLiveSessionId);
      setAiLiveProcessing(false);
      setAiLiveResultUrl(null);
      setAiLiveResultGarment(null);
    }
  }, [removeGarment, aiLiveEnabled, aiLiveSessionId]);

  const toggleAiLivePreview = useCallback(async () => {
    if (aiLiveEnabled) {
      if (aiLiveSessionId) {
        void VirtualTryOnService.closeLiveSession(aiLiveSessionId);
      }
      setAiLiveEnabled(false);
      setAiLiveSessionId(null);
      setAiLiveProcessing(false);
      setAiLiveError(null);
      toast.info('AI Live Preview deactivated. Instant Canvas tracking active.');
    } else {
      toast.loading('Initializing AI Live Preview session...', { id: 'ai-live-toggle' });
      const cfg = await VirtualTryOnService.getBackendVTONConfig();
      setAiLiveConfigured(cfg.configured);

      const session = await VirtualTryOnService.createLiveSession();
      setAiLiveSessionId(session.sessionId);
      setAiLiveEnabled(true);
      setAiLiveError(null);

      if (!cfg.configured) {
        toast.info(
          'Cloud Generative AI is unconfigured (requires VTON_API_KEY). Running local Canvas 2D Tracker.',
          { id: 'ai-live-toggle', duration: 4500 }
        );
      } else {
        toast.success('✨ AI Live Keyframe synthesis active. Frames will be sampled periodically.', {
          id: 'ai-live-toggle',
        });
        void sampleAndSubmitLiveFrame(session.sessionId);
      }
    }
  }, [aiLiveEnabled, aiLiveSessionId, sampleAndSubmitLiveFrame]);

  // Teardown session on unmount
  useEffect(() => {
    return () => {
      if (aiLiveSessionId) {
        void VirtualTryOnService.closeLiveSession(aiLiveSessionId);
      }
    };
  }, [aiLiveSessionId]);

  const handleStopCamera = useCallback(() => {
    if (aiLiveSessionId) {
      void VirtualTryOnService.closeLiveSession(aiLiveSessionId);
      setAiLiveSessionId(null);
      setAiLiveEnabled(false);
      setAiLiveProcessing(false);
      setAiLiveError(null);
    }
    stopCamera();
  }, [aiLiveSessionId, stopCamera]);

  const handleSwitchCamera = useCallback(async () => {
    await switchCamera();
    toast.info('Switched camera facing mode.');
  }, [switchCamera]);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen();
  }, []);

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
              <Camera className="h-3 w-3" />
              <span>LIVE AR MIRROR</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              33-POINT SKELETAL FIT
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Real-Time Virtual Fitting Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Live on-device body pose tracking with dynamic shoulder anchoring, chest contouring, and zero network latency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDebug}
            title={t('controls.debug_title')}
            aria-label={t('controls.debug_title')}
            className={`aura-pill transition ${
              debugMode ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{debugMode ? 'Debug: ON' : 'Debug: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="aura-pill hover:bg-white/10 text-slate-300 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Photo Fit Mode</span>
          </button>
        </div>
      </div>

      {(error || initializing) && (
        <div className="space-y-3">
          {initializing && !error && (
            <div className="aura-panel p-5">
              <Spinner label={t('camera.loading_models')} />
            </div>
          )}
          {error && <ErrorBanner message={error.message} onDismiss={() => setError(null)} />}
        </div>
      )}

      {/* Technology Mode Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0d0f18]/90 px-4 py-3 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            Real-Time Engine: Instant Canvas Tracker (2D Mesh Affine Warp · 30–60 FPS On-Device)
          </span>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            0ms Latency
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>
            Generative AI: <strong className="text-slate-200 font-semibold">IDM-VTON Diffusion</strong> via <em>AI Live Keyframe</em> or <em>Capture</em>
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Camera stage column (2 cols) */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div
            ref={stageRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#030407] sm:aspect-video shadow-2xl"
          >
            <canvas
              ref={canvasRef}
              className="tryon-canvas"
              role="img"
              aria-label={t('a11y.canvas_label')}
            />

            {/* Overlays */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-4 top-4 flex items-center gap-2">
                {cameraActive && <TrackingPill status={tracking} />}
              </div>

              {/* Viewport HUD Corner Reticles */}
              {cameraActive && (
                <>
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 pointer-events-none" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 pointer-events-none" />
                </>
              )}

              {/* Viewport Technology Indicator Badges */}
              <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-black/70 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-300 shadow-md backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LOCAL 30 FPS TRACKER</span>
                </div>
                {aiLiveEnabled && (
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/80 px-2.5 py-1 text-[11px] font-mono font-semibold text-amber-300 shadow-md backdrop-blur-md">
                    <Sparkles className={`h-3 w-3 text-amber-400 ${aiLiveProcessing ? 'animate-spin' : ''}`} />
                    <span>
                      {aiLiveProcessing
                        ? `AI SYNTHESIZING (${aiLiveProgress}%)...`
                        : 'AI KEYFRAME ACTIVE'}
                    </span>
                  </div>
                )}
              </div>

              {debugMode && (
                <DebugPanel
                  metrics={metrics}
                  tracking={tracking}
                  showLandmarks={showLandmarks}
                  showMask={showMask}
                  onToggleLandmarks={() => setShowLandmarks((v) => !v)}
                  onToggleMask={() => {
                    const next = !showMask;
                    setShowMask(next);
                    setMaskVisible(next);
                  }}
                />
              )}
            </div>

            {/* Empty / Not Started state */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#07080d]/90 p-6 text-center backdrop-blur-xl">
                {initializing ? (
                  <Spinner label={t('camera.loading_engine')} />
                ) : (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600/30 to-fuchsia-600/30 text-indigo-400 border border-indigo-500/30 shadow-2xl shadow-indigo-950/80">
                      <Camera className="h-9 w-9 text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-white text-lg">{t('camera.off_title')}</p>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">{t('camera.off_body')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      disabled={!engineReady}
                      aria-label={t('a11y.start_camera')}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition disabled:opacity-40"
                    >
                      {t('controls.start_camera')}
                    </button>
                    {!engineReady && !initializing && (
                      <p className="text-xs text-rose-400">{t('camera.engine_failed')}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Camera controls bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {cameraActive ? (
              <>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/60 transition shadow-md"
                >
                  <VideoOff className="h-3.5 w-3.5" />
                  <span>{t('controls.stop_camera')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{t('controls.switch_camera')}</span>
                </button>

                {availableCameras.length > 1 && (
                  <select
                    aria-label="Select Camera Device"
                    value={selectedCameraId || ''}
                    onChange={(e) => void switchCameraDevice(e.target.value)}
                    className="rounded-xl border border-white/[0.1] bg-[#0d0f18] px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 backdrop-blur-md"
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleCapture}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:opacity-95 transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{t('controls.capture_photo')}</span>
                </button>

                {/* AI Live Keyframe Toggle Switch */}
                <button
                  type="button"
                  onClick={toggleAiLivePreview}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition backdrop-blur-md shadow-md ${
                    aiLiveEnabled
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 shadow-amber-950/40'
                      : 'border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                  title="Toggle periodic AI generative diffusion frame sampling"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${aiLiveEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{aiLiveEnabled ? 'AI Live Keyframe: ON' : 'AI Live Keyframe: OFF'}</span>
                </button>

                {/* On-Demand Sample Button */}
                {aiLiveEnabled && (
                  <button
                    type="button"
                    onClick={() => aiLiveSessionId && void sampleAndSubmitLiveFrame(aiLiveSessionId)}
                    disabled={aiLiveProcessing}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
                  >
                    <Radio className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span>{aiLiveProcessing ? `Sampling (${aiLiveProgress}%)` : 'Sample Frame'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition backdrop-blur-md ml-auto"
                  title={t('controls.fullscreen_title')}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={!engineReady}
                aria-label={t('a11y.start_camera')}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 transition disabled:opacity-40"
              >
                {t('controls.start_camera')}
              </button>
            )}

            {garment && (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
                <span className="text-slate-400">Wearing:</span>
                <span className="font-semibold text-indigo-300">{garment.name}</span>
                <button
                  type="button"
                  onClick={removeGarment}
                  className="text-slate-400 hover:text-white ml-1"
                  title="Remove Garment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* AI Live Keyframe Synthesis Card */}
          {(aiLiveEnabled || aiLiveResultUrl) && (
            <div className="rounded-3xl border border-amber-500/30 bg-[#0d0f18]/90 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AI Diffusion Live Keyframe</span>
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                        IDM-VTON NEURAL
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sampled asynchronously from live video without affecting 30 FPS camera performance.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] border border-white/[0.08]">
                    Sampled: <strong className="text-white">{aiLiveSampledCount}</strong>
                  </span>
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] border border-white/[0.08]">
                    Dropped: <strong className="text-amber-300">{aiLiveDroppedCount}</strong>
                  </span>
                </div>
              </div>

              {/* Content area */}
              <div className="mt-4">
                {aiLiveError && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/25 p-3.5 text-xs text-rose-300 mb-4">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{aiLiveError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => aiLiveSessionId && void sampleAndSubmitLiveFrame(aiLiveSessionId)}
                      className="rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 px-3 py-1 text-[11px] font-semibold text-rose-200 shrink-0 transition"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {aiLiveConfigured === false ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="font-semibold text-amber-200">Cloud Generative AI Unconfigured</p>
                      <p>
                        Set <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">VTON_API_KEY</code> in the backend <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">.env</code> to connect real IDM-VTON diffusion inference.
                      </p>
                      <p className="text-slate-400">
                        The live camera operates seamlessly via local 30 FPS Canvas 2D geometric tracking with 0 network latency.
                      </p>
                    </div>
                  </div>
                ) : aiLiveProcessing && !aiLiveResultUrl ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <Spinner label={`Synthesizing AI diffusion keyframe (${aiLiveProgress}%)...`} />
                    <p className="text-xs text-slate-400 max-w-sm">
                      Running generative neural fabric synthesis. In-flight frames are dropped cleanly to ensure live camera tracking never stutters.
                    </p>
                  </div>
                ) : aiLiveResultUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative aspect-[3/4] w-48 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-lg">
                      <img
                        src={aiLiveResultUrl}
                        alt="AI Diffusion Synthesized Try-On"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-mono font-semibold text-emerald-300 text-center backdrop-blur-md">
                        ✨ AI SYNTHESIZED
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-200">
                            Photorealistic Fabric Drape & Lighting Synthesized
                          </span>
                          {aiLiveResultGarment && (
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-mono text-amber-300">
                              Garment: {aiLiveResultGarment}
                            </span>
                          )}
                        </div>
                        {garment && aiLiveResultGarment && garment.name !== aiLiveResultGarment && (
                          <p className="text-[11px] text-amber-400/90 mt-1">
                            New garment selected ({garment.name}) — generating updated keyframe...
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {aiLiveLastSampleTime
                            ? `Last updated: ${new Date(aiLiveLastSampleTime).toLocaleTimeString()}`
                            : 'Synthesized via cloud generative diffusion.'}
                        </p>
                      </div>

                      {aiLiveProcessing && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Synthesizing next keyframe...</span>
                            <span>{aiLiveProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${aiLiveProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!aiLiveResultUrl) return;
                            StorageService.saveLook({
                              title: aiLiveResultGarment ? `AI Live Look: ${aiLiveResultGarment}` : 'AI Live Try-On',
                              personImageUrl: aiLiveResultUrl,
                              resultImageUrl: aiLiveResultUrl,
                              garmentId: garment?.id || 'live-garment',
                              garmentName: aiLiveResultGarment || garment?.name || 'Selected Garment',
                              garmentCategory: garment?.category || ClothingCategory.T_SHIRT,
                              garmentImageUrl: garment?.imageUrl || '/garments/tee.svg',
                              isFavorite: true,
                            });
                            refreshSavedLooks();
                            toast.success('AI Look saved to private gallery!');
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/60 transition"
                        >
                          <Heart className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Save Look</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!aiLiveResultUrl) return;
                            const link = document.createElement('a');
                            link.download = `ai-live-tryon-${Date.now()}.png`;
                            link.href = aiLiveResultUrl;
                            link.click();
                            toast.success('Downloaded AI synthesized image.');
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Still</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!aiLiveResultUrl) return;
                            const currentGarment = garment || (selectedGarment as any) || FULL_PRODUCT_CATALOG[0];
                            setLastResult({
                              jobId: aiLiveSessionId || `live_${Date.now()}`,
                              personImageUrl: aiLiveResultUrl,
                              resultImageUrl: aiLiveResultUrl,
                              aiImageUrl: aiLiveResultUrl,
                              garmentImageUrl: currentGarment.imageUrl,
                              garmentName: aiLiveResultGarment || currentGarment.name,
                              garmentCategory: currentGarment.category,
                              timestamp: Date.now(),
                              modelUsed: 'IDM-VTON (Diffusion)',
                              confidence: 0.98,
                            });
                            navigate('results');
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition shadow-md shadow-amber-950/40"
                        >
                          <span>Open in Fit Studio</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 py-3">
                    <span>AI Keyframe sampler is waiting for the next scheduled frame...</span>
                    <button
                      type="button"
                      onClick={() => aiLiveSessionId && void sampleAndSubmitLiveFrame(aiLiveSessionId)}
                      disabled={aiLiveProcessing}
                      className="text-amber-300 hover:underline font-semibold"
                    >
                      Sample now &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Clothing panel */}
        <GarmentPanel
          currentGarmentId={garment?.id ?? null}
          disabled={!engineReady}
          onSelect={handleGarmentSelect}
          onUpload={handleGarmentUpload}
          onRemove={handleGarmentRemove}
        />
      </div>

      {/* Capture preview modal */}
      {captured && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-fade-in"
          onClick={() => setCaptured(null)}
        >
          <div
            className="flex max-w-lg w-full flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[#0d0f18]/95 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="font-display font-bold text-white text-base">Captured Virtual Try-On</h3>
              <button
                type="button"
                onClick={() => setCaptured(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-[3/4] max-h-[55vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <img
                src={captured}
                alt="Screenshot of Virtual Try-On"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCaptured(null)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={handleGeneratePhotorealStill}
                disabled={isGeneratingPhotoreal}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition shadow-md shadow-amber-950/40 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{isGeneratingPhotoreal ? 'Synthesizing...' : '✨ Generate Photoreal Still'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToGallery}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/60 transition"
              >
                <Heart className="h-3.5 w-3.5 text-indigo-400" />
                <span>Save Look</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition shadow-md shadow-indigo-600/30"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t('controls.download')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
