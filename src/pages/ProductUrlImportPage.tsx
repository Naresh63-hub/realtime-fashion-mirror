import React, { useState, useRef } from 'react';
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
      setError('Please paste a product URL to fetch.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtracted(null);

    try {
      const data = await extractProductFromUrl(url);
      setExtracted(data);
      setSelectedImage(data.selectedImageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract product information from URL.');
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
    navigate('live');
  };

  const handleStartPhotoTryOn = () => {
    if (!extracted) return;
    const prod = convertToProduct(extracted, selectedImage);
    setSelectedGarment(prod);
    navigate('photo-upload');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>🔗</span>
          <span>Shopping Product URL Import</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Paste any shopping product link. We extract garment imagery and metadata so you can virtually try it on.
        </p>
      </div>

      {/* URL Input Form */}
      <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
        <label htmlFor="product-url-input" className="block text-xs font-bold uppercase tracking-wider text-gray-300">
          Product URL from Online Retailer
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="product-url-input"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste your product link here (e.g. https://www.myntra.com/...)"
            className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={() => handleFetch()}
            disabled={loading}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {loading ? <Spinner label="Fetching..." /> : <span>Fetch Product</span>}
          </button>
        </div>

        {/* Supported Retailer Pills for quick testing */}
        <div className="pt-2">
          <p className="text-[11px] text-gray-400 mb-2 font-medium">Quick Test with Supported Retailers:</p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_RETAILERS.map((ret) => (
              <button
                key={ret.domain}
                type="button"
                onClick={() => {
                  setUrlInput(ret.example);
                  void handleFetch(ret.example);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition"
              >
                {ret.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner with Manual Fallback option */}
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-red-300 text-sm">Product URL Extraction Note</h4>
              <p className="text-xs text-red-200 mt-1">{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>

          <div className="pt-2 border-t border-red-500/20 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-300">
              Anti-bot protections or CORS policy may restrict direct fetching. You can upload the product image manually:
            </p>
            <button
              type="button"
              onClick={() => fallbackUploadRef.current?.click()}
              className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              Upload Product Image Manually
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
        <div className="rounded-3xl border border-white/10 bg-gray-900/80 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                ✓ Product Extracted Successfully
              </span>
              <h2 className="text-xl font-bold text-white mt-2">{extracted.title}</h2>
              <p className="text-xs text-violet-400 font-semibold">{extracted.brand} • {extracted.retailer}</p>
            </div>
            {extracted.price && (
              <div className="text-right">
                <span className="text-xs text-gray-400">Price</span>
                <p className="text-xl font-bold text-white">₹{extracted.price}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Primary Selected Image Preview */}
            <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 p-4 aspect-square">
              <img
                src={selectedImage}
                alt={extracted.title}
                className="max-h-64 max-w-full object-contain drop-shadow-lg"
              />
            </div>

            {/* Product details & Available Images */}
            <div className="md:col-span-7 space-y-4">
              {extracted.description && (
                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                  {extracted.description}
                </p>
              )}

              {/* Multiple Image Selection */}
              {extracted.images.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2">Select Best Garment Angle / Image:</p>
                  <div className="flex gap-2">
                    {extracted.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImage(img)}
                        className={`h-16 w-16 rounded-xl border p-1 transition ${
                          selectedImage === img
                            ? 'border-violet-500 bg-violet-500/20 ring-2 ring-violet-500'
                            : 'border-white/10 bg-white/5 hover:border-violet-400'
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
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 shadow-md transition flex items-center gap-1.5"
                >
                  📹 Try On in Live Camera
                </button>
                <button
                  type="button"
                  onClick={handleStartPhotoTryOn}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-md transition flex items-center gap-1.5"
                >
                  ✨ Try On with Photo
                </button>
                <a
                  href={extracted.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  🔗 Open Store Page ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
