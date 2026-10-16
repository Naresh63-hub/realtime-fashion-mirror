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
import { ClothingCategory } from '../types';

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
    startCamera,
    stopCamera,
    switchCamera,
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
      toast.loading('✨ Synthesizing photoreal still from live capture...', { id: 'live-photoreal' });
      const currentGarment = garment || (selectedGarment as any) || FULL_PRODUCT_CATALOG[0];
      const job = await VirtualTryOnService.generateTryOn({
        personImage: captured,
        garmentImage: currentGarment.imageUrl,
        garmentName: currentGarment.name,
        category: currentGarment.category,
        modelMode: 'cloud-genai',
      });

      let status = job.status;
      let attempts = 0;
      while (status !== 'succeeded' && status !== 'failed' && attempts < 15) {
        await new Promise((res) => setTimeout(res, 400));
        const updated = await VirtualTryOnService.getJobStatus(job.id);
        status = updated.status;
        attempts++;
      }

      if (status === 'succeeded') {
        const result = await VirtualTryOnService.retrieveResult(job.id);
        if (result) {
          setLastResult(result);
          toast.success('✨ Photoreal still ready! Routing to Fit Studio...', { id: 'live-photoreal' });
          setCaptured(null);
          navigate('results');
        }
      } else {
        toast.error('Photoreal generation timed out.', { id: 'live-photoreal' });
      }
    } catch {
      toast.error('Photoreal still generation failed.', { id: 'live-photoreal' });
    } finally {
      setIsGeneratingPhotoreal(false);
    }
  }, [captured, garment, selectedGarment, setLastResult, navigate]);

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

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Camera stage */}
        <section className="lg:col-span-2">
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
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {cameraActive ? (
              <>
                <button
                  type="button"
                  onClick={stopCamera}
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
                <button
                  type="button"
                  onClick={handleCapture}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-600/30"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{t('controls.capture_photo')}</span>
                </button>
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
