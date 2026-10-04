import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualTryOn } from '../hooks/useVirtualTryOn';
import { GarmentPanel } from './GarmentPanel';
import { DebugPanel } from './DebugPanel';
import { Button, ErrorBanner, Spinner, TrackingPill } from './ui';
import { useTranslation, type Locale } from '../i18n';
import { useAnnounce } from '../utils/a11yAnnouncer';

export function VirtualTryOn() {
  const { t, locale, setLocale } = useTranslation();
  const { announce } = useAnnounce();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [showLandmarks, setShowLandmarks] = useState(true);
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

  useEffect(() => {
    document.documentElement.dataset.showLandmarks = String(showLandmarks);
  }, [showLandmarks]);

  useEffect(() => {
    if (error) announce(error.message);
  }, [error, announce]);

  useEffect(() => {
    if (garment) announce(t('a11y.garment_loaded', { name: garment.name }));
  }, [garment, announce, t]);

  const handleCapture = useCallback(() => {
    const dataUrl = captureScreenshot();
    if (dataUrl) setCaptured(dataUrl);
  }, [captureScreenshot]);

  const handleDownload = useCallback(() => {
    if (!captured) return;
    const link = document.createElement('a');
    link.download = `tryon-${Date.now()}.png`;
    link.href = captured;
    link.click();
  }, [captured]);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen();
  }, []);

  const cycleLocale = useCallback(() => {
    const next: Locale = locale === 'en' ? 'hi-IN' : 'en';
    void setLocale(next);
  }, [locale, setLocale]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{t('header.title')}</h1>
            <p className="text-xs text-gray-300">{t('header.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleLocale}
              aria-label={locale === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-gray-200 backdrop-blur transition hover:bg-white/20 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
            >
              {locale === 'en' ? t('lang.en') : t('lang.hi')}
            </button>
            <Button
              variant="ghost"
              onClick={toggleDebug}
              title={t('controls.debug_title')}
              ariaLabel={t('controls.debug_title')}
              className="hidden sm:block"
            >
              {debugMode ? t('controls.debug_on') : t('controls.debug_off')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
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
              className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black sm:aspect-video"
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

              {/* Empty state */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/80 p-6 text-center">
                  {initializing ? (
                    <Spinner label={t('camera.loading_engine')} />
                  ) : (
                    <>
                      <div className="text-5xl">👗</div>
                      <div>
                        <p className="font-medium">{t('camera.off_title')}</p>
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

            {/* Camera controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {cameraActive ? (
                <>
                  <Button
                    variant="danger"
                    onClick={stopCamera}
                    ariaLabel={t('a11y.stop_camera')}
                  >
                    {t('controls.stop_camera')}
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={() => void switchCamera()}
                    ariaLabel={t('a11y.switch_camera')}
                  >
                    {t('controls.switch_camera')}
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={handleCapture}
                    ariaLabel={t('a11y.capture_photo')}
                  >
                    {t('controls.capture_photo')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={toggleFullscreen}
                    title={t('controls.fullscreen_title')}
                    ariaLabel={t('a11y.fullscreen')}
                  >
                    {t('controls.fullscreen')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => void startCamera()}
                  disabled={!engineReady}
                  ariaLabel={t('a11y.start_camera')}
                >
                  {t('controls.start_camera')}
                </Button>
              )}
              {garment && (
                <span className="ml-auto text-xs text-gray-300">
                  {t('garment_panel.wearing')}{' '}
                  <span className="text-gray-200">{garment.name}</span>
                </span>
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
      </main>

      {/* Capture preview modal */}
      {captured && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCaptured(null)}
        >
          <div
            className="max-w-2xl rounded-2xl border border-white/10 bg-gray-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={captured}
              alt={t('share.captured_alt')}
              className="max-h-[70vh] rounded-lg"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCaptured(null)}>
                {t('share.close')}
              </Button>
              <Button onClick={handleDownload}>{t('share.download_png')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
