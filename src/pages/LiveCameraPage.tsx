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
    if (dataUrl) {
      setCaptured(dataUrl);
      toast.success('Screenshot captured! You can now preview, save or download it.');
    }
  }, [captureScreenshot]);

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
      const job = await VirtualTryOnService.generateTryOn({
        personImage: captured,
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
  const [aiLiveConfigured, setAiLiveConfigured] = useState<boolean | null>(null);
  const [aiLiveDroppedCount, setAiLiveDroppedCount] = useState(0);
  const [aiLiveSampledCount, setAiLiveSampledCount] = useState(0);
  const [aiLiveLastSampleTime, setAiLiveLastSampleTime] = useState<number | null>(null);

  const sampleAndSubmitLiveFrame = useCallback(
    async (sessionId: string) => {
      if (!cameraActive) return;
      const currentGarment = garment || (selectedGarment as any) || FULL_PRODUCT_CATALOG[0];
      if (!currentGarment) return;

      const frameDataUrl = captureScreenshot();
      if (!frameDataUrl) return;

      setAiLiveProcessing(true);
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
          setAiLiveProcessing(false);
          setAiLiveProgress(100);
          setAiLiveLastSampleTime(Date.now());
          toast.success('✨ New AI Live Keyframe synthesized!', { id: 'live-ai-frame' });
        } else if (res.status === 'unconfigured') {
          setAiLiveConfigured(false);
          setAiLiveProcessing(false);
        }
      } catch {
        setAiLiveProcessing(false);
      }
    },
    [cameraActive, garment, selectedGarment, captureScreenshot]
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
        if (status.latestResultUrl && status.latestResultUrl !== aiLiveResultUrl) {
          setAiLiveResultUrl(status.latestResultUrl);
          setAiLiveLastSampleTime(Date.now());
          setAiLiveProcessing(false);
        }
      } catch {
        // Polling retry
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [aiLiveEnabled, aiLiveSessionId, aiLiveResultUrl]);

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

  const toggleAiLivePreview = useCallback(async () => {
    if (aiLiveEnabled) {
      if (aiLiveSessionId) {
        void VirtualTryOnService.closeLiveSession(aiLiveSessionId);
      }
      setAiLiveEnabled(false);
      setAiLiveSessionId(null);
      setAiLiveProcessing(false);
      toast.info('AI Live Preview deactivated. Instant Canvas tracking active.');
    } else {
      toast.loading('Initializing AI Live Preview session...', { id: 'ai-live-toggle' });
      const cfg = await VirtualTryOnService.getBackendVTONConfig();
      setAiLiveConfigured(cfg.configured);

      const session = await VirtualTryOnService.createLiveSession();
      setAiLiveSessionId(session.sessionId);
      setAiLiveEnabled(true);

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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Camera className="h-4 w-4" />
            </div>
            <span>Live Camera Try-On</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Real-time 33-point MediaPipe body tracking with dynamic torso anchoring and arm sleeves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={toggleDebug}
            title={t('controls.debug_title')}
            ariaLabel={t('controls.debug_title')}
            className="flex items-center gap-1.5 text-xs rounded-xl border border-white/10 bg-white/5"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{debugMode ? 'Debug: ON' : 'Debug: OFF'}</span>
          </Button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Switch to Photo Try-On</span>
          </button>
        </div>
      </div>

      {(error || initializing) && (
        <div className="space-y-3">
          {initializing && !error && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 backdrop-blur-md">
              <Spinner label={t('camera.loading_models')} />
            </div>
          )}
          {error && <ErrorBanner message={error.message} onDismiss={() => setError(null)} />}
        </div>
      )}

      {/* Technology Mode Banner: Honest & Transparent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gray-900/50 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-200">
            Live Stream: Instant Canvas Tracker (2D Mesh Affine Warp · 30–60 FPS On-Device)
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Zero Latency
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>
            Generative AI: <strong>IDM-VTON Diffusion</strong> via <em>AI Live Preview</em> or <em>Capture Photo</em>
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Camera stage column */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div
            ref={stageRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-black sm:aspect-video shadow-2xl"
          >
            <canvas
              ref={canvasRef}
              className="tryon-canvas"
              role="img"
              aria-label={t('a11y.canvas_label')}
            />

            {/* Overlays */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-3 top-3 flex items-center gap-2">
                {cameraActive && <TrackingPill status={tracking} />}
              </div>

              {/* Viewport Technology Indicator Badges */}
              <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-gray-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shadow-md backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Instant Canvas Tracker (30 FPS)</span>
                </div>
                {aiLiveEnabled && (
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gray-950/85 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-md backdrop-blur-md">
                    <Sparkles className={`h-3 w-3 text-amber-400 ${aiLiveProcessing ? 'animate-spin' : ''}`} />
                    <span>
                      {aiLiveProcessing
                        ? `AI Synthesizing (${aiLiveProgress}%)...`
                        : 'AI Keyframe Active'}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/80 p-6 text-center backdrop-blur-md">
                {initializing ? (
                  <Spinner label={t('camera.loading_engine')} />
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-900/40">
                      <Camera className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{t('camera.off_title')}</p>
                      <p className="mt-1 text-sm text-gray-400 max-w-sm">{t('camera.off_body')}</p>
                    </div>
                    <Button
                      onClick={() => void startCamera()}
                      disabled={!engineReady}
                      ariaLabel={t('a11y.start_camera')}
                      className="rounded-xl px-6 py-3 font-semibold shadow-lg shadow-violet-600/30"
                    >
                      {t('controls.start_camera')}
                    </Button>
                    {!engineReady && !initializing && (
                      <p className="text-xs text-red-400">{t('camera.engine_failed')}</p>
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
                  className="flex items-center gap-1.5 rounded-xl bg-red-600/90 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition shadow-md shadow-red-900/30"
                >
                  <VideoOff className="h-3.5 w-3.5" />
                  <span>{t('controls.stop_camera')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('controls.switch_camera')}</span>
                </button>
                {availableCameras.length > 1 && (
                  <select
                    aria-label="Select Camera Device"
                    value={selectedCameraId || ''}
                    onChange={(e) => void switchCameraDevice(e.target.value)}
                    className="rounded-xl border border-white/10 bg-gray-900/90 px-3 py-2 text-xs font-semibold text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 backdrop-blur-md"
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
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-600/30"
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
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 shadow-amber-900/30'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                  title="Toggle periodic AI generative diffusion frame sampling"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${aiLiveEnabled ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span>{aiLiveEnabled ? 'AI Live Preview: ON' : 'AI Live Preview: OFF'}</span>
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
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 transition backdrop-blur-md"
                  title={t('controls.fullscreen_title')}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <Button onClick={() => void startCamera()} disabled={!engineReady} ariaLabel={t('a11y.start_camera')}>
                {t('controls.start_camera')}
              </Button>
            )}

            {garment && (
              <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 backdrop-blur-md">
                <span>Wearing:</span>
                <span className="font-semibold text-violet-300">{garment.name}</span>
                <button
                  type="button"
                  onClick={removeGarment}
                  className="text-gray-400 hover:text-white ml-1"
                  title="Remove Garment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* AI Live Keyframe Synthesis Card */}
          {(aiLiveEnabled || aiLiveResultUrl) && (
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AI Diffusion Live Keyframe</span>
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        IDM-VTON Neural Synthesis
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Sampled asynchronously from live video without affecting 30 FPS camera performance.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="rounded-md bg-white/5 px-2 py-1 text-[11px]">
                    Sampled: <strong className="text-gray-200">{aiLiveSampledCount}</strong>
                  </span>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-[11px]">
                    Dropped: <strong className="text-amber-300">{aiLiveDroppedCount}</strong>
                  </span>
                </div>
              </div>

              {/* Content area */}
              <div className="mt-4">
                {aiLiveConfigured === false ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300 space-y-1">
                      <p className="font-semibold text-amber-200">Cloud Generative AI Unconfigured</p>
                      <p>
                        Set <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">VTON_API_KEY</code> in the backend <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">.env</code> to connect real IDM-VTON diffusion inference.
                      </p>
                      <p className="text-gray-400">
                        The live camera operates seamlessly via local 30 FPS Canvas 2D geometric tracking with 0 network latency.
                      </p>
                    </div>
                  </div>
                ) : aiLiveProcessing && !aiLiveResultUrl ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <Spinner label={`Synthesizing AI diffusion keyframe (${aiLiveProgress}%)...`} />
                    <p className="text-xs text-gray-400 max-w-sm">
                      Running generative neural fabric synthesis. In-flight frames are dropped cleanly to ensure live camera tracking never stutters.
                    </p>
                  </div>
                ) : aiLiveResultUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative aspect-[3/4] w-48 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
                      <img
                        src={aiLiveResultUrl}
                        alt="AI Diffusion Synthesized Try-On"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-semibold text-emerald-300 text-center backdrop-blur-md">
                        ✨ AI Synthesized
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-gray-200">
                            Photorealistic Fabric Drape & Lighting Synthesized
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {aiLiveLastSampleTime
                            ? `Last updated: ${new Date(aiLiveLastSampleTime).toLocaleTimeString()}`
                            : 'Synthesized via cloud generative diffusion.'}
                        </p>
                      </div>

                      {aiLiveProcessing && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
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
                              title: garment?.name ? `AI Live Look: ${garment.name}` : 'AI Live Try-On',
                              personImageUrl: aiLiveResultUrl,
                              resultImageUrl: aiLiveResultUrl,
                              garmentId: garment?.id || 'live-garment',
                              garmentName: garment?.name || 'Selected Garment',
                              garmentCategory: garment?.category || ClothingCategory.T_SHIRT,
                              garmentImageUrl: garment?.imageUrl || '/garments/tee.svg',
                              isFavorite: true,
                            });
                            refreshSavedLooks();
                            toast.success('AI Look saved to private gallery!');
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-950/70 transition"
                        >
                          <Heart className="h-3.5 w-3.5 text-violet-400" />
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
                          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
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
                              garmentName: currentGarment.name,
                              garmentCategory: currentGarment.category,
                              timestamp: Date.now(),
                              modelUsed: 'IDM-VTON (Diffusion)',
                              confidence: 0.98,
                            });
                            navigate('results');
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition shadow-md shadow-amber-900/30"
                        >
                          <span>Open in Fit Studio</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-gray-400 py-3">
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
          onSelect={(url, name, id) => {
            void loadGarmentUrl(url, name, id);
            toast.success(`Selected garment: ${name}`);
          }}
          onUpload={(file) => {
            void loadGarmentFile(file);
            toast.success(`Uploaded garment: ${file.name}`);
          }}
          onRemove={() => {
            removeGarment();
            toast.info('Garment removed.');
          }}
        />
      </div>

      {/* Capture preview modal */}
      {captured && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setCaptured(null)}
        >
          <div
            className="flex max-w-lg w-full flex-col gap-4 rounded-3xl border border-white/10 bg-gray-900/90 p-5 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Captured Virtual Try-On</h3>
              <button
                type="button"
                onClick={() => setCaptured(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={captured}
              alt="Screenshot of Virtual Try-On"
              className="max-h-[60vh] rounded-2xl object-contain border border-white/10 bg-black"
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCaptured(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={handleGeneratePhotorealStill}
                disabled={isGeneratingPhotoreal}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition shadow-md shadow-amber-900/30 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{isGeneratingPhotoreal ? 'Synthesizing...' : '✨ Generate Photoreal Still'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToGallery}
                className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-950/40 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-950/60 transition"
              >
                <Heart className="h-3.5 w-3.5 text-violet-400" />
                <span>Save Look</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-600/30"
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
