import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Shirt,
  X,
  Zap,
  Cpu,
  Info,
  Link2,
  Camera,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { VirtualTryOnService } from '../services/virtualTryOnService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { extractProductFromUrl } from '../services/productExtractor';
import { Spinner } from '../components/ui';
import type { TryOnJobStatus } from '../types';

export const PhotoUploadPage: React.FC = () => {
  const {
    uploadedPhoto,
    setUploadedPhoto,
    selectedGarment,
    setSelectedGarment,
    setLastResult,
    navigate,
    preferences,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [framingPreset, setFramingPreset] = useState<'auto' | 'portrait' | 'full-body'>('auto');

  // Engine selection: Instant Canvas (local) vs AI Diffusion (cloud)
  const [engineMode, setEngineMode] = useState<'client-high-res' | 'cloud-genai'>(
    preferences.inferenceMode || 'client-high-res'
  );
  const [backendConfig, setBackendConfig] = useState<{
    configured: boolean;
    provider: string;
    modelName: string;
    guidance: string;
  } | null>(null);

  // Check backend VTON status on mount
  useEffect(() => {
    VirtualTryOnService.getBackendVTONConfig().then((cfg) => {
      setBackendConfig(cfg);
      if (
        cfg?.configured &&
        (preferences.inferenceMode === 'cloud-genai' || import.meta.env.VITE_VTON_INFERENCE_MODE === 'cloud-genai')
      ) {
        setEngineMode('cloud-genai');
      }
    });
  }, [preferences.inferenceMode]);

  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrlInput, setImportUrlInput] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);

  const handleImportUrl = async () => {
    if (!importUrlInput.trim()) {
      toast.error('Please enter a shopping product URL.');
      return;
    }
    try {
      setImportingUrl(true);
      toast.loading('Extracting product imagery from link...', { id: 'inline-import' });
      const extracted = await extractProductFromUrl(importUrlInput.trim());
      setSelectedGarment({
        id: `imported_${Date.now()}`,
        sku: `IMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: extracted.title,
        category: extracted.category,
        priceINR: extracted.price || 999,
        description: extracted.description || `Imported from ${extracted.retailer}`,
        imageUrl: extracted.selectedImageUrl,
        swatch: 'from-violet-600 to-indigo-700',
        brand: extracted.brand || extracted.retailer,
        retailerUrl: extracted.originalUrl,
        images: extracted.images,
        rating: 4.5,
        inStock: true,
        sizes: extracted.sizes || ['S', 'M', 'L', 'XL'],
      });
      toast.success(`Imported ${extracted.title}!`, { id: 'inline-import' });
      setImportUrlInput('');
      setShowUrlImport(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract product image from URL.';
      toast.error(msg, { id: 'inline-import' });
    } finally {
      setImportingUrl(false);
    }
  };

  const validateAndLoadFile = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Please upload a valid image (JPG, PNG, or WebP).';
      setError(msg);
      toast.error(msg);
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const msg = 'Image exceeds 10MB limit. Please upload a smaller photograph.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedPhoto(dataUrl);
      toast.success('Photograph loaded successfully!');
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      toast.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndLoadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleRunTryOn = async () => {
    if (!uploadedPhoto) {
      toast.error('Please upload a photo first.');
      return;
    }
    const garment = selectedGarment || FULL_PRODUCT_CATALOG[0];

    try {
      setProcessing(true);
      setError(null);

      // Handle unconfigured Cloud GenAI mode gracefully
      let effectiveMode = engineMode;
      if (engineMode === 'cloud-genai' && backendConfig && !backendConfig.configured) {
        toast.info(
          'Cloud Generative AI is unconfigured (requires VTON_API_KEY). Seamlessly processing with Instant Canvas Try-On.',
          { duration: 5000 }
        );
        effectiveMode = 'client-high-res';
      }

      setProgressMsg(
        effectiveMode === 'cloud-genai'
          ? 'Submitting to IDM-VTON diffusion pipeline...'
          : 'Analyzing upper body landmarks & calculating drape mesh...'
      );
      toast.loading(
        effectiveMode === 'cloud-genai' ? 'Synthesizing generative AI try-on...' : 'Synthesizing virtual try-on drape...',
        { id: 'vton-proc' }
      );

      // Also render canvas drape concurrently if cloud mode is selected so user has both for comparison
      let canvasDrapePromise: Promise<string> | null = null;
      if (effectiveMode === 'cloud-genai') {
        canvasDrapePromise = VirtualTryOnService.renderClientTryOn(
          uploadedPhoto,
          garment.imageUrl,
          garment.category,
          { framingPreset }
        ).catch(() => '');
      }

      const job = await VirtualTryOnService.generateTryOn({
        personImage: uploadedPhoto,
        garmentImage: garment.imageUrl,
        garmentName: garment.name,
        category: garment.category,
        modelMode: effectiveMode,
        fitOptions: { framingPreset },
      });

      if (job.status === 'failed') {
        throw new Error(job.error || 'Try-on job submission failed.');
      }

      let status: TryOnJobStatus = job.status;
      let attempts = 0;
      const maxAttempts = effectiveMode === 'cloud-genai' ? 45 : 15;

      while (status !== 'succeeded' && status !== 'failed' && attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, effectiveMode === 'cloud-genai' ? 1500 : 400));
        const updated = await VirtualTryOnService.getJobStatus(job.id);
        status = updated.status;
        attempts++;

        if (effectiveMode === 'cloud-genai') {
          if (updated.progress > 70) {
            setProgressMsg('Finalizing cloth drape and skin-seam blending...');
          } else if (updated.progress > 30) {
            setProgressMsg('Denoising cloth folds and texture matching...');
          }
        } else {
          if (updated.progress > 50) {
            setProgressMsg('Applying bilateral warp and shadow feathering...');
          }
        }
      }

      if (status === 'succeeded') {
        const result = await VirtualTryOnService.retrieveResult(job.id);

        if (canvasDrapePromise) {
          const canvasResult = await canvasDrapePromise;
          if (canvasResult) {
            result.canvasImageUrl = canvasResult;
            result.aiImageUrl = result.resultImageUrl;
          }
        }

        setLastResult(result);
        toast.success('Virtual Try-On generated successfully!', { id: 'vton-proc' });
        navigate('results');
      } else {
        const lastJob = await VirtualTryOnService.getJobStatus(job.id);
        throw new Error(lastJob.error || 'Virtual try-on processing timed out or failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Try-on processing failed.';
      setError(msg);
      toast.error(msg, { id: 'vton-proc' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" />
              <span>STUDIO ATELIER</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              PHOTO SYNTHESIS
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Photo Virtual Try-On
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Upload your portrait or full-body photograph to simulate tailored drape, fabric folds, and lighting with neural precision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="aura-pill hover:bg-white/10 text-slate-300 transition"
          >
            <Shirt className="h-3.5 w-3.5 text-indigo-400" />
            <span>Open Wardrobe</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('live')}
            className="aura-pill hover:bg-white/10 text-slate-300 transition"
          >
            <Camera className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>Live AR Mirror</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-300 flex items-center justify-between backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/40 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Upload / Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) validateAndLoadFile(e.target.files[0]);
            }}
          />

          {!uploadedPhoto ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 backdrop-blur-2xl overflow-hidden ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-950/30 shadow-2xl shadow-indigo-950/60 scale-[1.01]'
                  : 'border-white/15 bg-[#0d0f18]/80 hover:border-indigo-500/50 hover:bg-[#111422]/90 shadow-2xl shadow-black/40'
              }`}
            >
              {/* Subtle radial sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none" />

              <div className="relative flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-fuchsia-600/20 text-indigo-400 mb-5 border border-indigo-500/30 shadow-xl group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud className="h-9 w-9 text-indigo-300" />
                </div>

                <h3 className="font-display font-bold text-lg text-white mb-2">
                  Upload Your Photograph
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Drag and drop your high-resolution portrait or full-body photo (JPG, PNG, WebP up to 10MB).
                </p>

                <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 group-hover:shadow-indigo-600/40 transition">
                  <span>Browse From Computer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-6 bg-white/[0.04] px-3.5 py-1.5 rounded-full border border-white/[0.08]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Encrypted & Private: Your photograph remains strictly confidential</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="aura-panel p-5 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                    Portrait Ready
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  High-Res Active
                </span>
              </div>

              {/* Viewport Frame with HUD styling */}
              <div className="relative aspect-[3/4] w-full max-h-[520px] overflow-hidden rounded-2xl bg-[#030407] flex items-center justify-center border border-white/[0.08] shadow-inner group">
                <img
                  src={uploadedPhoto}
                  alt="Uploaded portrait for try-on"
                  className="h-full w-full object-contain"
                />

                {/* HUD Corner Reticles */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500/60 pointer-events-none" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-indigo-500/60 pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-indigo-500/60 pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500/60 pointer-events-none" />

                {/* Framing preset badge */}
                <div className="absolute top-4 right-6 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-300">
                  MODE: {framingPreset.toUpperCase()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] hover:text-white transition backdrop-blur-md"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Replace Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPhoto(null);
                    toast.info('Photo removed.');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Garment Selector & Try-On Action (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="aura-panel p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Shirt className="h-4 w-4 text-indigo-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-slate-200">
                  Target Garment
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                1 ITEM SELECTED
              </span>
            </div>

            {selectedGarment ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#07080d]/80 p-4 space-y-4">
                <div className={`relative flex h-44 items-center justify-center rounded-xl bg-gradient-to-br ${selectedGarment.swatch} p-4 shadow-inner overflow-hidden group`}>
                  <img
                    src={selectedGarment.imageUrl}
                    alt={selectedGarment.name}
                    className="max-h-36 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-slate-300 uppercase">
                    {selectedGarment.category}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-base text-white">{selectedGarment.name}</h4>
                    <p className="text-xs font-semibold text-indigo-400">{selectedGarment.brand}</p>
                  </div>
                  <span className="font-mono font-bold text-base text-white">₹{selectedGarment.priceINR.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('gallery')}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition text-center"
                  >
                    Wardrobe
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlImport((v) => !v)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/20 transition text-center"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{showUrlImport ? 'Close Link' : 'Import Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info(`Opening ${selectedGarment.name} in Live Camera...`);
                      navigate('live');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/10 px-3 py-2 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/20 transition text-center"
                    title="Try this garment in Live Camera"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Live Mirror</span>
                  </button>
                </div>

                {/* Multiple Extracted Images Selector */}
                {selectedGarment.images && selectedGarment.images.length > 1 && (
                  <div className="pt-3 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Select Garment Angle / View:
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {selectedGarment.images.indexOf(selectedGarment.imageUrl) + 1} / {selectedGarment.images.length}
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {selectedGarment.images.map((img, idx) => {
                        const isSelected = selectedGarment.imageUrl === img;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedGarment({ ...selectedGarment, imageUrl: img });
                              toast.info(`Selected view #${idx + 1}`);
                            }}
                            className={`h-14 w-14 flex-shrink-0 rounded-xl border p-1 transition ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-600/20 ring-2 ring-indigo-500/40 shadow-md'
                                : 'border-white/[0.08] bg-white/[0.03] hover:border-indigo-400/50'
                            }`}
                            title={`Select image view ${idx + 1}`}
                          >
                            <img
                              src={img}
                              alt={`${selectedGarment.name} angle ${idx + 1}`}
                              className="h-full w-full object-contain"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showUrlImport && (
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-2 mt-2">
                    <p className="text-[11px] font-semibold text-indigo-300">
                      Paste shopping product URL:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.zara.com/... or Myntra, Amazon"
                        value={importUrlInput}
                        onChange={(e) => setImportUrlInput(e.target.value)}
                        className="flex-1 rounded-xl border border-white/[0.1] bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleImportUrl}
                        disabled={importingUrl}
                        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                      >
                        {importingUrl ? 'Extracting...' : 'Extract'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center space-y-3">
                <p className="text-xs text-slate-400">No garment selected.</p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('gallery')}
                    className="aura-pill bg-indigo-600/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/20"
                  >
                    Browse Closet →
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlImport((v) => !v)}
                    className="aura-pill bg-white/[0.05] text-slate-300 border-white/[0.1] hover:bg-white/[0.08]"
                  >
                    <Link2 className="h-3 w-3" />
                    <span>Import Link</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Garment Switcher */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                Quick Wardrobe Switch:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {FULL_PRODUCT_CATALOG.slice(0, 6).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setSelectedGarment(prod);
                      toast.info(`Selected ${prod.name}`);
                    }}
                    className={`flex-shrink-0 w-14 h-14 rounded-xl border p-1 transition ${
                      selectedGarment?.id === prod.id
                        ? 'border-indigo-500 bg-indigo-600/25 ring-2 ring-indigo-500/40 shadow-md'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-indigo-400/50'
                    }`}
                  >
                    <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* Try-On Technology / Engine Selection */}
            <div className="space-y-3 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                  Fitting Engine Mode:
                </label>
                {backendConfig && (
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                      backendConfig.configured
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {backendConfig.configured ? 'AI READY' : 'AI UNCONFIGURED'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEngineMode('client-high-res')}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                    engineMode === 'client-high-res'
                      ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-md ring-1 ring-indigo-500/30'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Instant Canvas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    ⚡ 0ms latency · On-device drape · Interactive fit studio
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEngineMode('cloud-genai')}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                    engineMode === 'cloud-genai'
                      ? 'border-fuchsia-500 bg-fuchsia-600/15 text-white shadow-md ring-1 ring-fuchsia-500/30'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-fuchsia-300">
                    <Cpu className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span>AI Diffusion</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    ✨ IDM-VTON diffusion · Photoreal drape & fabric shadows
                  </span>
                </button>
              </div>

              {engineMode === 'cloud-genai' && (
                <div className="flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-2.5 text-[11px] text-indigo-300">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 text-indigo-400 mt-0.5" />
                  <span>
                    Privacy notice: In AI Diffusion mode, your photo and garment image are transmitted securely to the inference provider. Photos are not permanently stored.
                  </span>
                </div>
              )}

              {engineMode === 'cloud-genai' && backendConfig && !backendConfig.configured && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-[11px] text-amber-300">
                  <Info className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Cloud AI requires <code className="text-amber-200">VTON_API_KEY</code> in backend <code className="text-amber-200">.env</code>. You can generate now and the system will provide Instant Canvas Try-On.
                  </span>
                </div>
              )}
            </div>

            {/* Framing Mode Selection */}
            <div className="space-y-2 pt-2">
              <label className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                Framing Perspective:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'portrait', label: 'Bust / Torso' },
                  { id: 'full-body', label: 'Full Body' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFramingPreset(mode.id as any)}
                    className={`py-2 text-[11px] font-mono font-semibold rounded-xl border transition ${
                      framingPreset === mode.id
                        ? 'border-indigo-500 bg-indigo-600/25 text-white shadow-sm'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Process Action Button */}
            <div className="pt-2">
              {processing ? (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-5 text-center space-y-3 backdrop-blur-md">
                  <Spinner label={progressMsg || 'Synthesizing Virtual Try-On...'} />
                  <p className="text-[11px] text-slate-400">
                    Applying bilateral anchor warp, geometric fitting, and seamless light blending.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRunTryOn}
                  disabled={!uploadedPhoto}
                  className="relative group w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-[1px] shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 py-3.5 px-4 text-sm font-bold text-white">
                    <Sparkles className="h-4 w-4" />
                    <span>GENERATE VIRTUAL TRY-ON</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
