import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Shirt,
  X,
  Zap,
  Cpu,
  AlertCircle,
  Info,
  Link2,
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
    VirtualTryOnService.getBackendVTONConfig().then(setBackendConfig);
  }, []);

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>Personal Photo Virtual Try-On</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Upload a clear photograph of yourself to simulate how clothing drapes on your body.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-300 flex items-center justify-between backdrop-blur-md">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Upload / Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
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
              className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition duration-300 backdrop-blur-xl ${
                dragActive
                  ? 'border-violet-400 bg-violet-950/30 shadow-2xl shadow-violet-900/50 scale-[1.01]'
                  : 'border-white/15 bg-gray-900/50 hover:border-violet-500/60 hover:bg-gray-900/80 shadow-xl'
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/20 text-violet-400 mb-4 border border-violet-500/30 shadow-md">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Upload Your Photograph</h3>
              <p className="text-xs text-gray-400 max-w-sm mb-5">
                Drag and drop your JPG, PNG, or WebP photo here, or click to browse files.
              </p>
              <button
                type="button"
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition"
              >
                Choose Photo from Device
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Processed on-device: Your photos stay in your browser.</span>
              </div>
            </div>
          ) : (
            <div className="relative rounded-3xl border border-white/10 bg-gray-900/70 p-4 space-y-4 backdrop-blur-xl shadow-2xl">
              <div className="relative aspect-[3/4] w-full max-h-[500px] overflow-hidden rounded-2xl bg-black flex items-center justify-center border border-white/5">
                <img
                  src={uploadedPhoto}
                  alt="Uploaded portrait for try-on"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-violet-400" />
                  <span>Replace Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPhoto(null);
                    toast.info('Photo removed.');
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Garment Selector & Try-On Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 space-y-4 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2">
              <Shirt className="h-4 w-4 text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Selected Garment for Try-On
              </h3>
            </div>

            {selectedGarment ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                <div className={`flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedGarment.swatch} p-4 shadow-inner`}>
                  <img
                    src={selectedGarment.imageUrl}
                    alt={selectedGarment.name}
                    className="max-h-32 object-contain drop-shadow-md"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedGarment.name}</h4>
                    <p className="text-xs text-violet-400 font-semibold">{selectedGarment.brand}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-200">₹{selectedGarment.priceINR}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('gallery')}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 transition text-center"
                  >
                    Browse Closet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlImport((v) => !v)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/20 transition text-center"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{showUrlImport ? 'Close Link' : 'Import Link'}</span>
                  </button>
                </div>

                {showUrlImport && (
                  <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-3 space-y-2 mt-2">
                    <p className="text-[11px] font-semibold text-violet-300">
                      Paste shopping product URL:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.zara.com/... or Myntra, Amazon"
                        value={importUrlInput}
                        onChange={(e) => setImportUrlInput(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleImportUrl}
                        disabled={importingUrl}
                        className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 transition disabled:opacity-50"
                      >
                        {importingUrl ? 'Fetching...' : 'Extract'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-3">
                <p className="text-xs text-gray-400">No garment selected.</p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('gallery')}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-400 hover:bg-white/10 transition"
                  >
                    Browse Closet →
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlImport((v) => !v)}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/20 transition"
                  >
                    <Link2 className="h-3 w-3" />
                    <span>Import Link</span>
                  </button>
                </div>
                {showUrlImport && (
                  <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-3 space-y-2 text-left">
                    <p className="text-[11px] font-semibold text-violet-300">
                      Paste shopping product URL:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.zara.com/... or Myntra, Amazon"
                        value={importUrlInput}
                        onChange={(e) => setImportUrlInput(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleImportUrl}
                        disabled={importingUrl}
                        className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 transition disabled:opacity-50"
                      >
                        {importingUrl ? 'Fetching...' : 'Extract'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Garment Carousel */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">Switch Garment Quickly:</p>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {FULL_PRODUCT_CATALOG.slice(0, 5).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setSelectedGarment(prod);
                      toast.info(`Selected ${prod.name}`);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl border p-1 transition ${
                      selectedGarment?.id === prod.id
                        ? 'border-violet-500 bg-violet-600/25 ring-2 ring-violet-500/40'
                        : 'border-white/10 bg-white/5 hover:border-violet-400'
                    }`}
                  >
                    <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* Try-On Technology / Engine Selection */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-300">Try-On Engine Technology:</label>
                {backendConfig && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      backendConfig.configured
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {backendConfig.configured ? 'AI Ready' : 'AI Unconfigured'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEngineMode('client-high-res')}
                  className={`flex flex-col text-left p-3 rounded-2xl border transition ${
                    engineMode === 'client-high-res'
                      ? 'border-violet-500 bg-violet-600/20 text-white shadow-md ring-1 ring-violet-500/30'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-violet-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Instant Canvas</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    ⚡ Local on-device · 0s latency · Interactive fit studio
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEngineMode('cloud-genai')}
                  className={`flex flex-col text-left p-3 rounded-2xl border transition ${
                    engineMode === 'cloud-genai'
                      ? 'border-purple-500 bg-purple-600/20 text-white shadow-md ring-1 ring-purple-500/30'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                    <Cpu className="h-3.5 w-3.5 text-purple-400" />
                    <span>AI Diffusion</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    ✨ IDM-VTON model · Photoreal cloth drape & shadows
                  </span>
                </button>
              </div>

              {engineMode === 'cloud-genai' && (
                <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-950/20 p-2.5 text-[11px] text-violet-300">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 text-violet-400 mt-0.5" />
                  <span>
                    Privacy notice: In AI Diffusion mode, your selected photo and garment image are transmitted securely to the inference provider to generate the try-on result. Frames and photos are not stored permanently.
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
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-gray-300">Photo Framing Mode:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'portrait', label: 'Portrait / Bust' },
                  { id: 'full-body', label: 'Full Body' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFramingPreset(mode.id as any)}
                    className={`py-1.5 text-[11px] font-semibold rounded-xl border transition ${
                      framingPreset === mode.id
                        ? 'border-violet-500 bg-violet-600/30 text-white shadow-sm'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Process Action Button */}
            <div className="pt-1">
              {processing ? (
                <div className="rounded-2xl border border-violet-500/30 bg-violet-950/40 p-5 text-center space-y-3 backdrop-blur-md">
                  <Spinner label={progressMsg || 'Processing Virtual Try-On...'} />
                  <p className="text-[11px] text-gray-400">
                    Performing on-device geometric anchor alignment and realistic shadow blend.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRunTryOn}
                  disabled={!uploadedPhoto}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-700/40 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition transform active:scale-[0.99]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Virtual Try-On</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
