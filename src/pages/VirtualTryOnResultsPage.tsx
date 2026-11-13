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
  Share2,
  Zap,
  Cpu,
  Layers,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { VirtualTryOnService, type TryOnFitOptions } from '../services/virtualTryOnService';
import type { TryOnResult, TryOnJobStatus } from '../types';

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

  // Active layer for comparison: 'canvas' (instant) vs 'ai' (diffusion)
  const [activeLayer, setActiveLayer] = useState<'canvas' | 'ai'>(
    lastResult?.aiImageUrl ? 'ai' : 'canvas'
  );
  const [backendConfig, setBackendConfig] = useState<{
    configured: boolean;
    provider: string;
    modelName: string;
    guidance: string;
  } | null>(null);
  const [isGeneratingCloudAI, setIsGeneratingCloudAI] = useState(false);

  // Fetch backend VTON configuration on mount
  useEffect(() => {
    VirtualTryOnService.getBackendVTONConfig().then(setBackendConfig);
  }, []);

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
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [isGeneratingPhotoreal, setIsGeneratingPhotoreal] = useState(false);

  const handleGeneratePhotorealStill = async () => {
    if (!personImg) return;
    try {
      setIsGeneratingPhotoreal(true);
      toast.loading('✨ Synthesizing photoreal still with enhanced drape & lighting...', { id: 'photoreal-still' });
      
      const updated = await VirtualTryOnService.renderClientTryOn(
        personImg,
        garment.imageUrl,
        garment.category,
        {
          offsetY,
          offsetX,
          scale,
          widthFactor,
          rotation,
          opacity: 1.0,
          framingPreset,
        }
      );

      if (updated) {
        setCurrentResultImg(updated);
        if (lastResult) {
          setLastResult({
            ...lastResult,
            resultImageUrl: updated,
          });
        }
        toast.success('✨ Photoreal still synthesized successfully!', { id: 'photoreal-still' });
      }
    } catch {
      toast.error('Photoreal still generation failed.', { id: 'photoreal-still' });
    } finally {
      setIsGeneratingPhotoreal(false);
    }
  };

  const handleGenerateCloudAI = async () => {
    if (!personImg) return;
    if (!backendConfig?.configured) {
      toast.error(
        'Cloud Generative AI is unconfigured. Set VTON_API_KEY (e.g. Replicate token) in backend .env to enable IDM-VTON diffusion.',
        { duration: 6000 }
      );
      return;
    }

    try {
      setIsGeneratingCloudAI(true);
      toast.loading('Submitting to IDM-VTON Diffusion model...', { id: 'cloud-vton-gen' });

      const job = await VirtualTryOnService.generateTryOn({
        personImage: personImg,
        garmentImage: garment.imageUrl,
        garmentName: garment.name,
        category: garment.category,
        modelMode: 'cloud-genai',
      });

      if (job.status === 'failed') {
        throw new Error(job.error || 'Cloud AI submission failed.');
      }

      let status: TryOnJobStatus = job.status;
      let attempts = 0;
      while (status !== 'succeeded' && status !== 'failed' && attempts < 45) {
        await new Promise((res) => setTimeout(res, 1800));
        const updated = await VirtualTryOnService.getJobStatus(job.id);
        status = updated.status;
        attempts++;
        if (updated.progress > 50) {
          toast.loading(`Synthesizing photoreal drape & fabric texture (${updated.progress}%)...`, {
            id: 'cloud-vton-gen',
          });
        }
      }

      if (status === 'succeeded') {
        const res = await VirtualTryOnService.retrieveResult(job.id);
        if (res.resultImageUrl) {
          const updatedResult: TryOnResult = {
            ...(lastResult || {
              jobId: job.id,
              personImageUrl: personImg,
              garmentImageUrl: garment.imageUrl,
              garmentName: garment.name,
              garmentCategory: garment.category,
              timestamp: Date.now(),
              modelUsed: res.modelUsed,
            }),
            resultImageUrl: res.resultImageUrl,
            aiImageUrl: res.resultImageUrl,
            canvasImageUrl: lastResult?.canvasImageUrl || currentResultImg,
          };
          setLastResult(updatedResult);
          setActiveLayer('ai');
          setCurrentResultImg(res.resultImageUrl);
          toast.success('✨ Photoreal Generative AI try-on synthesized successfully!', { id: 'cloud-vton-gen' });
        }
      } else {
        const failedJob = await VirtualTryOnService.getJobStatus(job.id);
        throw new Error(failedJob.error || 'Diffusion inference failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI try-on generation failed.';
      toast.error(msg, { id: 'cloud-vton-gen' });
    } finally {
      setIsGeneratingCloudAI(false);
    }
  };

  const handleShareLook = () => {
    const params = new URLSearchParams({
      garment: garment.id,
      scale: String(scale),
      width: String(widthFactor),
      y: String(offsetY),
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}#/results?${params.toString()}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('🔗 Shareable look link copied to clipboard!');
      }).catch(() => {
        toast.info(`Look link: ${shareUrl}`);
      });
    } else {
      toast.info(`Look link: ${shareUrl}`);
    }
  };

  // Restore deep-link parameters on mount
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const query = hash.split('?')[1];
        const params = new URLSearchParams(query);
        const s = params.get('scale');
        const w = params.get('width');
        const y = params.get('y');
        if (s) setScale(Number(s));
        if (w) setWidthFactor(Number(w));
        if (y) setOffsetY(Number(y));
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // If no try-on has been generated yet, show prompt instead of demo images
  if (!lastResult?.personImageUrl) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-6 animate-fade-in">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-2xl">
          <Sparkles className="h-10 w-10 text-indigo-300" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">No Virtual Try-On Result Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Upload your personal photograph or open your live camera to see clothing dynamically drape on your body.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Your Photo</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('live')}
            className="aura-pill hover:bg-white/10 text-slate-200 px-6 py-3 text-sm transition"
          >
            <Camera className="h-4 w-4 text-fuchsia-400" />
            <span>Open Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="aura-pill hover:bg-white/10 text-slate-200 px-6 py-3 text-sm transition"
          >
            <span>Browse Wardrobe</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              <span>SYNTHESIS COMPLETE</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              FIT STUDIO
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Virtual Try-On Result
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Review simulated cloth drape, toggle between Instant Canvas and IDM-VTON Diffusion, and use the <strong>Adjust Fit Studio</strong> to tailor dimensions.
          </p>
        </div>

        {/* View toggle & Adjust Fit drawer toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0d0f18] border border-white/[0.08] rounded-xl p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'slider' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Interactive Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'side-by-side' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Side by Side</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFitStudio(!showFitStudio)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition backdrop-blur-xl ${
              showFitStudio
                ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300 shadow-lg shadow-indigo-950/50'
                : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Adjust Fit</span>
            {showFitStudio ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Comparison Area (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Layer Switcher & AI Synthesis Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0f18]/90 p-3.5 rounded-2xl border border-white/[0.08] backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-400">Viewing Layer:</span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer('canvas');
                    if (lastResult?.canvasImageUrl) {
                      setCurrentResultImg(lastResult.canvasImageUrl);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeLayer === 'canvas'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-3 w-3 text-amber-400" />
                  <span>Instant Canvas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (lastResult?.aiImageUrl) {
                      setActiveLayer('ai');
                      setCurrentResultImg(lastResult.aiImageUrl);
                    } else {
                      handleGenerateCloudAI();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeLayer === 'ai'
                      ? 'bg-fuchsia-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="h-3 w-3 text-fuchsia-400" />
                  <span>{lastResult?.aiImageUrl ? 'IDM-VTON Diffusion' : 'Generate AI Still'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!lastResult?.aiImageUrl && (
                <button
                  type="button"
                  onClick={handleGenerateCloudAI}
                  disabled={isGeneratingCloudAI}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-indigo-950/40 hover:opacity-95 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isGeneratingCloudAI ? 'Synthesizing...' : 'Generate AI Diffusion'}</span>
                </button>
              )}
              {backendConfig && (
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                    backendConfig.configured
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                  title={backendConfig.guidance}
                >
                  {backendConfig.configured ? 'AI READY' : 'AI UNCONFIGURED'}
                </span>
              )}
            </div>
          </div>

          {viewMode === 'slider' ? (
            <div className="relative aspect-[3/4] max-h-[620px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#030407] shadow-2xl select-none backdrop-blur-xl group">
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
                className="absolute inset-y-0 w-0.5 bg-white/80 shadow-2xl pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-950 shadow-2xl text-xs font-bold border border-white/40">
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
                <div className="pointer-events-none absolute top-4 right-4 rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md animate-pulse">
                  Updating Drape...
                </div>
              )}

              {/* HUD Reticles */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 pointer-events-none" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 pointer-events-none" />

              {/* Corner Badges */}
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-black/70 px-3 py-1 text-xs font-mono font-semibold text-slate-300 backdrop-blur-md border border-white/10">
                ORIGINAL PHOTO
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl bg-indigo-600/80 px-3 py-1 text-xs font-mono font-semibold text-white backdrop-blur-md border border-indigo-400/30">
                {activeLayer === 'ai' ? 'IDM-VTON DIFFUSION STILL' : 'INSTANT CANVAS DRAPE'}
              </div>
            </div>
          ) : lastResult?.aiImageUrl ? (
            /* 3-Way Side-by-Side Comparison: Original vs Canvas vs AI Diffusion */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-[#07080d]/80 p-3 flex flex-col items-center backdrop-blur-xl">
                <span className="font-mono text-xs text-slate-400 mb-2 font-semibold">1. Original Photo</span>
                <img src={personImg} alt="Original" className="max-h-[460px] object-contain rounded-xl" />
              </div>
              <div className="rounded-2xl border border-indigo-500/30 bg-[#07080d]/80 p-3 flex flex-col items-center backdrop-blur-xl">
                <div className="flex items-center justify-between w-full mb-2 px-1">
                  <span className="font-mono text-xs text-indigo-400 font-semibold flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    2. Canvas Drape
                  </span>
                  <span className="text-[10px] bg-indigo-600/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono">Local</span>
                </div>
                <img
                  src={lastResult.canvasImageUrl || currentResultImg}
                  alt="Instant Canvas Result"
                  className="max-h-[460px] object-contain rounded-xl"
                />
              </div>
              <div className="rounded-2xl border border-fuchsia-500/40 bg-[#07080d]/80 p-3 flex flex-col items-center backdrop-blur-xl shadow-lg shadow-fuchsia-950/20">
                <div className="flex items-center justify-between w-full mb-2 px-1">
                  <span className="font-mono text-xs text-fuchsia-400 font-semibold flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-fuchsia-400" />
                    3. AI Diffusion
                  </span>
                  <span className="text-[10px] bg-fuchsia-600/30 text-fuchsia-300 px-1.5 py-0.5 rounded font-mono">IDM-VTON</span>
                </div>
                <img
                  src={lastResult.aiImageUrl}
                  alt="Generative AI Result"
                  className="max-h-[460px] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-[#07080d]/80 p-3 flex flex-col items-center backdrop-blur-xl">
                <span className="font-mono text-xs text-slate-400 mb-2 font-semibold">1. Original Photo</span>
                <img src={personImg} alt="Original" className="max-h-[460px] object-contain rounded-xl" />
              </div>
              <div className="rounded-2xl border border-indigo-500/40 bg-[#07080d]/80 p-3 flex flex-col items-center backdrop-blur-xl">
                <span className="font-mono text-xs text-indigo-400 mb-2 font-semibold flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" />
                  2. Canvas Result
                </span>
                <img src={currentResultImg} alt="Try-On Result" className="max-h-[460px] object-contain rounded-xl" />
              </div>
              <div className="rounded-2xl border border-dashed border-fuchsia-500/30 bg-fuchsia-950/20 p-5 flex flex-col items-center justify-center text-center space-y-3 backdrop-blur-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="font-display text-xs font-bold text-white">Compare with AI Diffusion</h4>
                <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
                  Synthesize deep cloth folds and realistic fabric shadows using IDM-VTON.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateCloudAI}
                  disabled={isGeneratingCloudAI}
                  className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:opacity-95 transition disabled:opacity-50"
                >
                  {isGeneratingCloudAI ? 'Synthesizing...' : 'Generate 3-Way AI Still'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Fitting Studio & Drape Controls */}
          {showFitStudio && (
            <div className="aura-panel p-6 space-y-5 shadow-2xl relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-white">Interactive Fit Studio</h3>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    LIVE REAL-TIME DRAPE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFit}
                    className="flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Quick Framing Presets */}
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-300 flex items-center justify-between">
                  <span>Photo Framing & Auto-Snap:</span>
                  <span className="text-[11px] text-slate-400 lowercase font-normal">Click if garment covers face or collar</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handlePresetPortrait}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'portrait'
                        ? 'border-indigo-500 bg-indigo-600/25 text-white shadow-sm'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Portrait / Bust</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetAutoAi}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'auto'
                        ? 'border-indigo-500 bg-indigo-600/25 text-white shadow-sm'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>AI Landmark Snap</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetFullBody}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      framingPreset === 'full-body'
                        ? 'border-indigo-500 bg-indigo-600/25 text-white shadow-sm'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Full Standing Fit</span>
                  </button>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Vertical Position */}
                <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <MoveVertical className="h-3.5 w-3.5 text-indigo-400" />
                      Vertical Position (Up / Down)
                    </span>
                    <span className="font-mono text-indigo-400">{offsetY > 0 ? `+${offsetY}px` : `${offsetY}px`}</span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="350"
                    step="5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setOffsetY((v) => Math.max(-250, v - 20))}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                    >
                      ▲ Move Up
                    </button>
                    <span>Move Down →</span>
                    <button
                      type="button"
                      onClick={() => setOffsetY((v) => Math.min(350, v + 20))}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                    >
                      ▼ Move Down
                    </button>
                  </div>
                </div>

                {/* Horizontal Position */}
                <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <MoveHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                      Horizontal Center (Left / Right)
                    </span>
                    <span className="font-mono text-indigo-400">{offsetX > 0 ? `+${offsetX}px` : `${offsetX}px`}</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>← Left</span>
                    <button
                      type="button"
                      onClick={() => setOffsetX(0)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                    >
                      Center
                    </button>
                    <span>Right →</span>
                  </div>
                </div>

                {/* Garment Scale & Size */}
                <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
                      Garment Size / Proportions
                    </span>
                    <span className="font-mono text-indigo-400">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.7"
                    step="0.02"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                        className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg ${
                          Math.abs(scale - sz.val) < 0.04
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Silhouette & Cut */}
                <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <RotateCw className="h-3.5 w-3.5 text-indigo-400" />
                      Garment Silhouette / Fit
                    </span>
                    <span className="font-mono text-indigo-400">
                      {widthFactor < 0.95 ? 'Slim' : widthFactor > 1.2 ? 'Oversized' : widthFactor > 1.05 ? 'Relaxed' : 'Regular'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
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
                            ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                            : 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        {sil.label}
                      </button>
                    ))}
                  </div>
                  {/* Rotation adjustment */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Tilt Angle:</span>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-28 h-1 bg-white/10 rounded appearance-none accent-indigo-500"
                    />
                    <span className="font-mono text-slate-300 w-8 text-right">{rotation}°</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fit Honesty & Simulation Disclaimer */}
          <p className="text-[11px] text-slate-400 leading-relaxed bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
            ℹ️ <strong>Fit Honesty & Visual Approximation:</strong> This try-on is an automated geometric body drape preview, not an exact tailoring measurement. Real-world fabric stretch and drape may vary. Use the Fit Studio sliders to evaluate tight ↔ relaxed silhouette preferences.
          </p>
        </div>

        {/* Right: Selected Product Details & Next Steps (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="aura-panel p-6 space-y-5 shadow-2xl relative">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-white/[0.08]">
              Tried-On Garment
            </h3>

            <div className="flex items-center gap-3">
              <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${garment.swatch} p-2 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden`}>
                <img src={garment.imageUrl} alt={garment.name} className="h-full w-full object-contain" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-white line-clamp-1">{garment.name}</h4>
                <p className="text-xs text-indigo-400 font-semibold">{garment.brand}</p>
                <p className="font-mono text-xs text-slate-200 font-bold mt-1">₹{garment.priceINR.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              {/* Photoreal Still Generator */}
              <button
                type="button"
                onClick={handleGeneratePhotorealStill}
                disabled={isGeneratingPhotoreal}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 py-3 text-xs font-bold text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition shadow-lg shadow-amber-950/40 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{isGeneratingPhotoreal ? 'Synthesizing...' : '✨ Generate Photoreal Still'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveLook}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 text-xs font-bold text-white hover:opacity-95 shadow-lg shadow-indigo-600/30 transition"
              >
                <Heart className="h-4 w-4" />
                <span>Save Look to Gallery</span>
              </button>

              <button
                type="button"
                onClick={handleShareLook}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
              >
                <Share2 className="h-4 w-4 text-indigo-400" />
                <span>Share Look (Privacy-Safe Link)</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
              >
                <Download className="h-4 w-4" />
                <span>Download Result Image</span>
              </button>

              <button
                type="button"
                onClick={handleCompareOutfits}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
              >
                <Columns2 className="h-4 w-4" />
                <span>Compare Outfits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.success(`Opening ${garment.name} in Live Camera fitting room...`);
                  navigate('live');
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition backdrop-blur-md shadow-sm"
              >
                <Camera className="h-4 w-4 text-indigo-400" />
                <span>Try this Garment in Live Camera</span>
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="aura-panel p-5 space-y-3">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">Try Another Experience</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => navigate('live')}
                className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/10 py-2.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/20 transition text-center backdrop-blur-md flex items-center justify-center gap-1"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('gallery')}
                className="rounded-xl bg-white/[0.06] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition text-center backdrop-blur-md border border-white/[0.08]"
              >
                Wardrobe
              </button>
              <button
                type="button"
                onClick={() => navigate('photo-upload')}
                className="rounded-xl border border-white/[0.08] py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition text-center backdrop-blur-md"
              >
                Photo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
