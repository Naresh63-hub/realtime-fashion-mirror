import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SlidersHorizontal,
  Download,
  Heart,
  Columns2,
  CheckCircle2,
  Wand2,
  RotateCcw,
  MoveVertical,
  MoveHorizontal,
  Maximize2,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Camera,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { VirtualTryOnService, type TryOnFitOptions } from '../services/virtualTryOnService';

export const VirtualTryOnResultsPage: React.FC = () => {
  const {
    lastResult,
    setLastResult,
    selectedGarment,
    navigate,
    refreshSavedLooks,
  } = useApp();

  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [showFitStudio, setShowFitStudio] = useState(true);

  // Use the user's actual uploaded photograph or live capture
  const personImg = lastResult?.personImageUrl || '';
  const garment = selectedGarment || FULL_PRODUCT_CATALOG[0];

  // Dynamic live try-on image
  const [currentResultImg, setCurrentResultImg] = useState<string>(
    lastResult?.resultImageUrl || ''
  );
  const [isReRendering, setIsReRendering] = useState(false);

  // Interactive Fit Adjustments
  const [offsetY, setOffsetY] = useState(0); // Vertical offset in pixels (-300 to +300)
  const [offsetX, setOffsetX] = useState(0); // Horizontal offset in pixels (-200 to +200)
  const [scale, setScale] = useState(1.0); // Overall scale (0.5 to 1.8)
  const [widthFactor, setWidthFactor] = useState(1.0); // Silhouette width (0.8 to 1.4)
  const [rotation, setRotation] = useState(0); // Degrees (-25 to +25)
  const [opacity, setOpacity] = useState(0.98);
  const [framingPreset, setFramingPreset] = useState<'auto' | 'portrait' | 'half-body' | 'full-body'>('auto');

  // Debounce ref to keep slider performance ultra smooth
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recomputeDrape = useCallback(
    (opts: TryOnFitOptions) => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }

      renderTimeoutRef.current = setTimeout(async () => {
        try {
          setIsReRendering(true);
          const updated = await VirtualTryOnService.renderClientTryOn(
            personImg,
            garment.imageUrl,
            garment.category,
            opts
          );
          setCurrentResultImg(updated);
          if (lastResult) {
            setLastResult({
              ...lastResult,
              resultImageUrl: updated,
            });
          }
        } catch (err) {
          console.error('Interactive drape re-render error:', err);
        } finally {
          setIsReRendering(false);
        }
      }, 100);
    },
    [personImg, garment, lastResult, setLastResult]
  );

  // Trigger re-computation on adjustment changes
  useEffect(() => {
    if (!personImg) return;
    recomputeDrape({
      offsetY,
      offsetX,
      scale,
      widthFactor,
      rotation,
      opacity,
      framingPreset,
    });
  }, [personImg, offsetY, offsetX, scale, widthFactor, rotation, opacity, framingPreset, recomputeDrape]);

  // Quick preset handlers
  const handlePresetPortrait = () => {
    setFramingPreset('portrait');
    setOffsetY(0);
    setOffsetX(0);
    setScale(1.05);
    setWidthFactor(1.0);
    setRotation(0);
    toast.success('Applied Portrait / Headshot fit preset.');
  };

  const handlePresetFullBody = () => {
    setFramingPreset('full-body');
    setOffsetY(0);
    setOffsetX(0);
    setScale(1.0);
    setWidthFactor(1.0);
    setRotation(0);
    toast.success('Applied Full Standing Body preset.');
  };

  const handlePresetAutoAi = () => {
    setFramingPreset('auto');
    setOffsetY(0);
    setOffsetX(0);
    setScale(1.0);
    setWidthFactor(1.0);
    setRotation(0);
    toast.success('Auto-aligned to detected body landmarks.');
  };

  const handleResetFit = () => {
    setOffsetY(0);
    setOffsetX(0);
    setScale(1.0);
    setWidthFactor(1.0);
    setRotation(0);
    setFramingPreset('auto');
    toast.info('Fit adjustments reset to initial calculation.');
  };

  const handleSizeSelect = (newScale: number, label: string) => {
    setScale(newScale);
    toast.info(`Selected Size: ${label}`);
  };

  const handleSilhouetteSelect = (factor: number, label: string) => {
    setWidthFactor(factor);
    toast.info(`Selected Cut: ${label}`);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `tryon-look-${Date.now()}.png`;
    link.href = currentResultImg;
    link.click();
    toast.success('Try-on image downloaded with custom fit!');
  };

  const handleSaveLook = () => {
    StorageService.saveLook({
      title: `Virtual Look with ${garment.name}`,
      personImageUrl: personImg,
      resultImageUrl: currentResultImg,
      garmentId: garment.id,
      garmentName: garment.name,
      garmentCategory: garment.category,
      garmentImageUrl: garment.imageUrl,
      priceINR: garment.priceINR,
      isFavorite: true,
    });
    refreshSavedLooks();
    toast.success('Fitted look saved to your private gallery! ❤️');
  };

  const handleCompareOutfits = () => {
    const newLook = StorageService.saveLook({
      title: `Virtual Look with ${garment.name}`,
      personImageUrl: personImg,
      resultImageUrl: currentResultImg,
      garmentId: garment.id,
      garmentName: garment.name,
      garmentCategory: garment.category,
      garmentImageUrl: garment.imageUrl,
      priceINR: garment.priceINR,
      isFavorite: false,
    });
    StorageService.toggleCompareLook(newLook.id);
    refreshSavedLooks();
    toast.info('Added to outfit comparison list.');
    navigate('compare');
  };

  // If no try-on has been generated yet, show prompt instead of demo images
  if (!lastResult?.personImageUrl) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-xl">
          <Sparkles className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">No Virtual Try-On Result Yet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Upload your personal photograph or open your live camera to see clothing dynamically drape on your body.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Your Photo</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('live')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
          >
            <Camera className="h-4 w-4 text-violet-400" />
            <span>Open Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
          >
            <span>Browse Garments</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            <span>Synthesis Complete</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2">
            <span>Virtual Try-On Result</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Drape preview anchored to body proportions. Use the <strong>Adjust Fit Studio</strong> below to fine-tune garment position and size.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900/80 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'slider' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Interactive Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'side-by-side' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Side by Side</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFitStudio(!showFitStudio)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-2xl border transition backdrop-blur-xl ${
              showFitStudio
                ? 'border-violet-500/50 bg-violet-600/30 text-violet-300 shadow-lg shadow-violet-900/40'
                : 'border-white/15 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5 text-violet-400" />
            <span>Adjust Fit</span>
            {showFitStudio ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Comparison Area (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {viewMode === 'slider' ? (
            <div className="relative aspect-[3/4] max-h-[600px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl select-none backdrop-blur-xl">
              {/* After (Generated result) - background layer */}
              <img
                src={currentResultImg}
                alt="After: Virtual Try-On Result"
                className="absolute inset-0 h-full w-full object-contain"
              />

              {/* Before (Original photograph) - clipped overlay */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={personImg}
                  alt="Before: Original Photograph"
                  className="absolute inset-0 h-full w-full object-contain max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Slider Divider Line & Thumb */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white shadow-lg pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl text-xs font-bold">
                  ↔
                </div>
              </div>

              {/* Drag controller input */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                aria-label="Drag before and after try-on comparison"
              />

              {/* Re-rendering indicator badge */}
              {isReRendering && (
                <div className="pointer-events-none absolute top-4 right-4 rounded-xl bg-violet-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md animate-pulse">
                  Updating Drape...
                </div>
              )}

              {/* Corner Badges */}
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/10">
                Original Photo
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl bg-violet-600/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-violet-400/20">
                Virtual Try-On
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-black/60 p-3 flex flex-col items-center backdrop-blur-xl">
                <span className="text-xs text-gray-400 mb-2 font-semibold">Original Photograph</span>
                <img src={personImg} alt="Original" className="max-h-[480px] object-contain rounded-2xl" />
              </div>
              <div className="rounded-3xl border border-violet-500/40 bg-black/60 p-3 flex flex-col items-center backdrop-blur-xl">
                <span className="text-xs text-violet-400 mb-2 font-semibold">Virtual Try-On Result</span>
                <img src={currentResultImg} alt="Try-On Result" className="max-h-[480px] object-contain rounded-2xl" />
              </div>
            </div>
          )}

          {/* Interactive Fitting Studio & Drape Controls */}
          {showFitStudio && (
            <div className="rounded-3xl border border-violet-500/30 bg-gray-900/80 p-5 space-y-5 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600/30 text-violet-400 border border-violet-500/40">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Interactive Fit Studio</h3>
                  <span className="text-[11px] text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                    Live Real-Time Drape
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFit}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Quick Framing Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>Photo Framing & Auto-Snap:</span>
                  <span className="text-[11px] text-gray-400">Click if garment covers face or collar</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handlePresetPortrait}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'portrait'
                        ? 'border-violet-500 bg-violet-600/30 text-white shadow-md'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-violet-400" />
                    <span>Portrait / Bust Shot</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetAutoAi}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'auto'
                        ? 'border-violet-500 bg-violet-600/30 text-white shadow-md'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>AI Landmark Snap</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetFullBody}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'full-body'
                        ? 'border-violet-500 bg-violet-600/30 text-white shadow-md'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-violet-400" />
                    <span>Full Standing Fit</span>
                  </button>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Vertical Position */}
                <div className="space-y-1.5 bg-black/30 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1">
                      <MoveVertical className="h-3.5 w-3.5 text-violet-400" />
                      Vertical Position (Up / Down)
                    </span>
                    <span className="font-mono text-violet-400">{offsetY > 0 ? `+${offsetY}px` : `${offsetY}px`}</span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="350"
                    step="5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setOffsetY((v) => Math.max(-250, v - 20))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                    >
                      ▲ Move Up
                    </button>
                    <span>Move Down →</span>
                    <button
                      type="button"
                      onClick={() => setOffsetY((v) => Math.min(350, v + 20))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                    >
                      ▼ Move Down
                    </button>
                  </div>
                </div>

                {/* Horizontal Position */}
                <div className="space-y-1.5 bg-black/30 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1">
                      <MoveHorizontal className="h-3.5 w-3.5 text-violet-400" />
                      Horizontal Center (Left / Right)
                    </span>
                    <span className="font-mono text-violet-400">{offsetX > 0 ? `+${offsetX}px` : `${offsetX}px`}</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                    <span>← Left</span>
                    <button
                      type="button"
                      onClick={() => setOffsetX(0)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                    >
                      Center
                    </button>
                    <span>Right →</span>
                  </div>
                </div>

                {/* Garment Scale & Size */}
                <div className="space-y-1.5 bg-black/30 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1">
                      <Maximize2 className="h-3.5 w-3.5 text-violet-400" />
                      Garment Size / Proportions
                    </span>
                    <span className="font-mono text-violet-400">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.7"
                    step="0.02"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  {/* Quick Size Tags */}
                  <div className="flex gap-1 justify-between pt-1">
                    {[
                      { label: 'XS', val: 0.82 },
                      { label: 'S', val: 0.90 },
                      { label: 'M', val: 1.00 },
                      { label: 'L', val: 1.12 },
                      { label: 'XL', val: 1.25 },
                      { label: 'XXL', val: 1.38 },
                    ].map((sz) => (
                      <button
                        key={sz.label}
                        type="button"
                        onClick={() => handleSizeSelect(sz.val, sz.label)}
                        className={`flex-1 py-0.5 text-[10px] font-bold rounded ${
                          Math.abs(scale - sz.val) < 0.04
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Silhouette & Cut */}
                <div className="space-y-1.5 bg-black/30 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1">
                      <RotateCw className="h-3.5 w-3.5 text-violet-400" />
                      Garment Silhouette / Fit
                    </span>
                    <span className="font-mono text-violet-400">
                      {widthFactor < 0.95 ? 'Slim' : widthFactor > 1.2 ? 'Oversized' : widthFactor > 1.05 ? 'Relaxed' : 'Regular'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: 'Slim', val: 0.88 },
                      { label: 'Regular', val: 1.00 },
                      { label: 'Relaxed', val: 1.15 },
                      { label: 'Oversized', val: 1.30 },
                    ].map((sil) => (
                      <button
                        key={sil.label}
                        type="button"
                        onClick={() => handleSilhouetteSelect(sil.val, sil.label)}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition ${
                          Math.abs(widthFactor - sil.val) < 0.05
                            ? 'border-violet-500 bg-violet-600 text-white'
                            : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {sil.label}
                      </button>
                    ))}
                  </div>
                  {/* Rotation adjustment */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-gray-400">Tilt Angle:</span>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-28 h-1 bg-white/10 rounded appearance-none accent-violet-500"
                    />
                    <span className="font-mono text-gray-300 w-8 text-right">{rotation}°</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Realistic Simulation Disclaimer */}
          <p className="text-[11px] text-gray-400 leading-relaxed bg-white/5 border border-white/5 rounded-2xl p-3.5 backdrop-blur-md">
            ⚠️ <strong>Virtual Try-On Preview:</strong> This visualization simulates garment placement and body drape using computer vision and geometric mesh warping. Real-world fabric stretch, drape, and texture may vary.
          </p>
        </div>

        {/* Right: Selected Product Details & Next Steps (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 space-y-4 backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Tried-On Garment
            </h3>

            <div className="flex items-center gap-3">
              <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${garment.swatch} p-2 flex items-center justify-center flex-shrink-0 shadow-inner`}>
                <img src={garment.imageUrl} alt={garment.name} className="h-full w-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{garment.name}</h4>
                <p className="text-xs text-violet-400 font-semibold">{garment.brand}</p>
                <p className="text-xs text-gray-300 font-bold mt-1">₹{garment.priceINR}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleSaveLook}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500 shadow-lg shadow-violet-600/30 transition"
              >
                <Heart className="h-4 w-4" />
                <span>Save Look to Gallery</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
              >
                <Download className="h-4 w-4" />
                <span>Download Result Image</span>
              </button>

              <button
                type="button"
                onClick={handleCompareOutfits}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
              >
                <Columns2 className="h-4 w-4" />
                <span>Compare Outfits</span>
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="rounded-3xl border border-white/10 bg-gray-900/40 p-5 space-y-3 backdrop-blur-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Try Another Style</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('gallery')}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition text-center backdrop-blur-md"
              >
                Browse Garments
              </button>
              <button
                type="button"
                onClick={() => navigate('photo-upload')}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition text-center backdrop-blur-md"
              >
                Change Photo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
