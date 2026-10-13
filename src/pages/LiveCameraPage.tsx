import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualTryOn } from '../hooks/useVirtualTryOn';
import { GarmentPanel } from '../components/GarmentPanel';
import { DebugPanel } from '../components/DebugPanel';
import { Button, ErrorBanner, Spinner, TrackingPill } from '../components/ui';
import { useTranslation } from '../i18n';
import { useAnnounce } from '../utils/a11yAnnouncer';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { ClothingCategory } from '../types';

export const LiveCameraPage: React.FC = () => {
  const { t } = useTranslation();
  const { announce } = useAnnounce();
  const { selectedGarment, navigate, refreshSavedLooks } = useApp();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    if (error) announce(error.message);
  }, [error, announce]);

  const handleCapture = useCallback(() => {
    const dataUrl = captureScreenshot();
    if (dataUrl) {
      setCaptured(dataUrl);
      setSaveSuccess(false);
    }
  }, [captureScreenshot]);

  const handleDownload = useCallback(() => {
    if (!captured) return;
    const link = document.createElement('a');
    link.download = `tryon-live-${Date.now()}.png`;
    link.href = captured;
    link.click();
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
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [captured, garment, refreshSavedLooks]);

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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📹</span>
            <span>Live Camera Try-On</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Real-time 33-point MediaPipe body tracking with dynamic torso anchoring and arm sleeves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={toggleDebug}
            title={t('controls.debug_title')}
            ariaLabel={t('controls.debug_title')}
            className="text-xs"
          >
            {debugMode ? '🛠️ Debug: ON' : '🛠️ Debug: OFF'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
          >
            ✨ Switch to Photo Try-On
          </button>
        </div>
      </div>

      {(error || initializing) && (
        <div className="space-y-3">
          {initializing && !error && (
            <div className="rounded-xl border border-white/10 bg-gray-900/60 p-4">
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
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black sm:aspect-video shadow-2xl"
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/80 p-6 text-center">
                {initializing ? (
                  <Spinner label={t('camera.loading_engine')} />
                ) : (
                  <>
                    <div className="text-5xl">👗</div>
                    <div>
                      <p className="font-semibold text-white text-base">{t('camera.off_title')}</p>
                      <p className="mt-1 text-sm text-gray-300">{t('camera.off_body')}</p>
                    </div>
                    <Button
                      onClick={() => void startCamera()}
                      disabled={!engineReady}
                      ariaLabel={t('a11y.start_camera')}
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {cameraActive ? (
              <>
                <Button variant="danger" onClick={stopCamera} ariaLabel={t('a11y.stop_camera')}>
                  {t('controls.stop_camera')}
                </Button>
                <Button variant="neutral" onClick={() => void switchCamera()} ariaLabel={t('a11y.switch_camera')}>
                  🔄 {t('controls.switch_camera')}
                </Button>
                <Button variant="primary" onClick={handleCapture} ariaLabel={t('a11y.capture_photo')}>
                  📸 {t('controls.capture_photo')}
                </Button>
                <Button variant="ghost" onClick={toggleFullscreen} title={t('controls.fullscreen_title')} ariaLabel={t('a11y.fullscreen')}>
                  ⛶ {t('controls.fullscreen')}
                </Button>
              </>
            ) : (
              <Button onClick={() => void startCamera()} disabled={!engineReady} ariaLabel={t('a11y.start_camera')}>
                {t('controls.start_camera')}
              </Button>
            )}

            {garment && (
              <div className="ml-auto flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10 text-xs text-gray-300">
                <span>Wearing:</span>
                <span className="font-semibold text-violet-300">{garment.name}</span>
                <button
                  type="button"
                  onClick={removeGarment}
                  className="text-gray-400 hover:text-white ml-1"
                  title="Remove Garment"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Clothing panel */}
        <GarmentPanel
          currentGarmentId={garment?.id ?? null}
          disabled={!engineReady}
          onSelect={(url, name, id) => void loadGarmentUrl(url, name, id)}
          onUpload={(file) => void loadGarmentFile(file)}
          onRemove={removeGarment}
        />
      </div>

      {/* Capture preview modal */}
      {captured && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setCaptured(null)}
        >
          <div
            className="flex max-w-lg flex-col gap-4 rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Captured Virtual Try-On</h3>
              <button
                type="button"
                onClick={() => setCaptured(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={captured}
              alt="Screenshot of Virtual Try-On"
              className="max-h-[60vh] rounded-xl object-contain border border-white/10 bg-black"
            />
            {saveSuccess && (
              <p className="text-xs text-emerald-400 font-semibold text-center">
                ✓ Look saved to your private gallery!
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setCaptured(null)}>
                {t('common.close')}
              </Button>
              <Button variant="neutral" onClick={handleSaveToGallery}>
                ❤️ Save Look
              </Button>
              <Button variant="primary" onClick={handleDownload}>
                📥 {t('controls.download')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
