import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Sparkles,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  Shirt,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { VirtualTryOnService } from '../services/virtualTryOnService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { Spinner } from '../components/ui';

// High quality model presets for instant testing
const DEMO_PORTRAIT_PRESETS = [
  {
    id: 'preset-casual-male',
    label: 'Casual Portrait (Male)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-fashion-female',
    label: 'Studio Portrait (Female)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-standing-neutral',
    label: 'Full Standing Fit',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
  },
];

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
      setProgressMsg('Analyzing upper body landmarks & calculating drape mesh...');
      toast.loading('Synthesizing virtual try-on drape...', { id: 'vton-proc' });

      const job = await VirtualTryOnService.generateTryOn({
        personImage: uploadedPhoto,
        garmentImage: garment.imageUrl,
        garmentName: garment.name,
        category: garment.category,
        modelMode: preferences.inferenceMode,
      });

      let status = job.status;
      let attempts = 0;
      while (status !== 'succeeded' && status !== 'failed' && attempts < 15) {
        await new Promise((res) => setTimeout(res, 400));
        const updated = await VirtualTryOnService.getJobStatus(job.id);
        status = updated.status;
        attempts++;
        if (updated.progress > 50) {
          setProgressMsg('Applying bilateral warp and shadow feathering...');
        }
      }

      if (status === 'succeeded') {
        const result = await VirtualTryOnService.retrieveResult(job.id);
        setLastResult(result);
        toast.success('Virtual Try-On generated successfully!', { id: 'vton-proc' });
        navigate('results');
      } else {
        throw new Error('Virtual try-on processing timed out or failed.');
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
          Upload a clear photograph of yourself or pick a preset portrait to simulate how clothing drapes on your body.
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

          {/* Quick Preset Models */}
          <div className="rounded-3xl border border-white/10 bg-gray-900/50 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Or Try with Sample Model Portraits
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {DEMO_PORTRAIT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setUploadedPhoto(preset.url);
                    toast.success(`Selected ${preset.label}`);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-2 text-center hover:border-violet-500/50 hover:bg-violet-950/20 transition group"
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="h-16 w-16 rounded-xl object-cover group-hover:scale-105 transition"
                  />
                  <span className="text-[10px] font-medium text-gray-300 truncate w-full">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
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
                    Change Garment
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-gray-400">No garment selected.</p>
                <button
                  type="button"
                  onClick={() => navigate('gallery')}
                  className="mt-2 text-xs font-semibold text-violet-400 hover:underline"
                >
                  Browse Garment Gallery →
                </button>
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

            {/* Process Action Button */}
            <div className="pt-2">
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
