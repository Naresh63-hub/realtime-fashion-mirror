import React, { useState, useRef } from 'react';
import {
  Link2,
  ExternalLink,
  Camera,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import {
  extractProductFromUrl,
  SUPPORTED_RETAILERS,
} from '../services/productExtractor';
import type { ExtractedProduct, Product } from '../types';
import { ClothingCategory } from '../types';
import { Spinner } from '../components/ui';

export const ProductUrlImportPage: React.FC = () => {
  const { navigate, setSelectedGarment } = useApp();

  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const fallbackUploadRef = useRef<HTMLInputElement>(null);

  const handleFetch = async (targetUrl?: string) => {
    const url = targetUrl || urlInput;
    if (!url.trim()) {
      const msg = 'Please paste a product URL to fetch.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);
    setExtracted(null);
    toast.loading('Analyzing link & fetching product imagery...', { id: 'fetch-prod' });

    try {
      const data = await extractProductFromUrl(url);
      setExtracted(data);
      setSelectedImage(data.selectedImageUrl);
      toast.success(`Successfully extracted ${data.title}!`, { id: 'fetch-prod' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract product information from URL.';
      setError(msg);
      toast.error(msg, { id: 'fetch-prod' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const manualProduct: ExtractedProduct = {
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Custom Uploaded Garment',
        brand: 'Manual Upload',
        price: 0,
        currency: 'INR',
        images: [dataUrl],
        selectedImageUrl: dataUrl,
        originalUrl: urlInput || 'https://uploaded-garment.local',
        category: ClothingCategory.T_SHIRT,
        retailer: 'Custom',
        description: 'Locally imported garment image.',
      };
      setExtracted(manualProduct);
      setSelectedImage(dataUrl);
      setError(null);
      toast.success('Custom garment image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const convertToProduct = (item: ExtractedProduct, imgUrl: string): Product => {
    return {
      id: `imported_${Date.now()}`,
      sku: `IMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: item.title,
      category: item.category,
      priceINR: item.price || 999,
      description: item.description || `Imported from ${item.retailer}`,
      imageUrl: imgUrl,
      swatch: 'from-violet-600 to-indigo-700',
      brand: item.brand || item.retailer,
      retailerUrl: item.originalUrl,
      images: item.images,
      rating: 4.5,
      inStock: true,
      sizes: item.sizes || ['S', 'M', 'L', 'XL'],
    };
  };

  const handleStartLiveTryOn = () => {
    if (!extracted) return;
    const prod = convertToProduct(extracted, selectedImage);
    setSelectedGarment(prod);
    toast.success(`Loaded ${prod.name} into Live Camera`);
    navigate('live');
  };

  const handleStartPhotoTryOn = () => {
    if (!extracted) return;
    const prod = convertToProduct(extracted, selectedImage);
    setSelectedGarment(prod);
    toast.success(`Loaded ${prod.name} into Photo Try-On`);
    navigate('photo-upload');
  };

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="aura-pill bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
            <Link2 className="h-3 w-3" />
            <span>EXTERNAL IMPORT</span>
          </span>
          <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            SAFE PARSER
          </span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Product URL Garment Extractor
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
          Paste any shopping link from supported e-commerce fashion stores. AURA parses metadata and high-res garment cutouts for instant virtual try-on.
        </p>
      </div>

      {/* URL Input Form */}
      <div className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
        <label htmlFor="product-url-input" className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
          Store Product URL
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="product-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste product link (e.g. https://www.myntra.com/... or Zara, Amazon)"
              className="w-full rounded-xl border border-white/[0.1] bg-black/60 pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
            />
          </div>
          <button
            type="button"
            onClick={() => handleFetch()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 disabled:opacity-40 transition"
          >
            {loading ? (
              <Spinner label="Extracting..." />
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Fetch Garment</span>
              </>
            )}
          </button>
        </div>

        {/* Supported Retailer Pills */}
        <div className="pt-2">
          <p className="font-mono text-[11px] text-slate-400 mb-2 font-medium">Quick Test with Supported Retailers:</p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_RETAILERS.map((ret) => (
              <button
                key={ret.domain}
                type="button"
                onClick={() => {
                  setUrlInput(ret.example);
                  void handleFetch(ret.example);
                }}
                className="aura-pill bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 text-xs transition"
              >
                {ret.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner with Manual Fallback option */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3 backdrop-blur-xl shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-rose-300 text-sm">Product URL Extraction Note</h4>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-white p-1 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="pt-3 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              Anti-bot protections or CORS policy may restrict direct fetching. You can upload the product image manually:
            </p>
            <button
              type="button"
              onClick={() => fallbackUploadRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.1] transition backdrop-blur-md"
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
              <span>Upload Product Image Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden manual file input */}
      <input
        ref={fallbackUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleManualImageUpload(e.target.files[0]);
        }}
      />

      {/* Extracted Product Preview Card */}
      {extracted && (
        <div className="aura-panel p-6 sm:p-8 space-y-6 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PRODUCT EXTRACTED SUCCESSFULLY</span>
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white mt-2">{extracted.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <p className="text-xs text-indigo-400 font-semibold">{extracted.brand} • {extracted.retailer}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  <span>IMPORTED SILHOUETTE</span>
                </span>
              </div>
            </div>
            {extracted.price && (
              <div className="sm:text-right">
                <span className="font-mono text-xs text-slate-400">Retail Price</span>
                <p className="font-mono text-2xl font-black text-white">₹{extracted.price.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Primary Selected Image Preview */}
            <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#07080d]/80 p-4 aspect-square shadow-inner">
              <img
                src={selectedImage}
                alt={extracted.title}
                className="max-h-64 max-w-full object-contain drop-shadow-xl"
              />
            </div>

            {/* Product details & Available Images */}
            <div className="md:col-span-7 space-y-4">
              {extracted.description && (
                <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.08]">
                  {extracted.description}
                </p>
              )}

              {/* Multiple Image Selection */}
              {extracted.images.length > 1 && (
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select Angle / View for Try-On:</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {extracted.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImage(img)}
                        className={`h-16 w-16 rounded-xl border p-1 transition flex-shrink-0 ${
                          selectedImage === img
                            ? 'border-indigo-500 bg-indigo-600/20 ring-2 ring-indigo-500/40 shadow-md'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-indigo-400/50'
                        }`}
                      >
                        <img src={img} alt={`Candidate ${i + 1}`} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartLiveTryOn}
                  className="flex items-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/10 hover:bg-fuchsia-600/20 px-5 py-2.5 text-xs font-semibold text-fuchsia-300 transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Try On in Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartPhotoTryOn}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-xs font-semibold text-white hover:opacity-95 shadow-lg shadow-indigo-600/30 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Try On with Photo</span>
                </button>
                <a
                  href={extracted.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition backdrop-blur-md"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Store Page ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
