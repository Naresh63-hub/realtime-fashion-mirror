import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Download,
  Heart,
  Columns2,
  Sparkles,
  ArrowRight,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { ClothingCategory } from '../types';

export const VirtualTryOnResultsPage: React.FC = () => {
  const {
    lastResult,
    selectedGarment,
    navigate,
    refreshSavedLooks,
  } = useApp();

  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  // If no previous result, provide fallback demo result so the page never errors
  const personImg =
    lastResult?.personImageUrl ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80';
  const resultImg = lastResult?.resultImageUrl || personImg;
  const garment = selectedGarment || FULL_PRODUCT_CATALOG[0];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `tryon-look-${Date.now()}.png`;
    link.href = resultImg;
    link.click();
    toast.success('Try-on image downloaded to your device!');
  };

  const handleSaveLook = () => {
    StorageService.saveLook({
      title: `Virtual Look with ${garment.name}`,
      personImageUrl: personImg,
      resultImageUrl: resultImg,
      garmentId: garment.id,
      garmentName: garment.name,
      garmentCategory: garment.category,
      garmentImageUrl: garment.imageUrl,
      priceINR: garment.priceINR,
      isFavorite: true,
    });
    refreshSavedLooks();
    toast.success('Look saved to your private gallery! ❤️');
  };

  const handleCompareOutfits = () => {
    const newLook = StorageService.saveLook({
      title: `Virtual Look with ${garment.name}`,
      personImageUrl: personImg,
      resultImageUrl: resultImg,
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
            Drape preview anchored to body proportions via {lastResult?.modelUsed || 'High-Resolution Mesh Warp'}.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 bg-gray-900/80 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
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
      </div>

      {/* Main Comparison Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Comparison Area (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {viewMode === 'slider' ? (
            <div className="relative aspect-[3/4] max-h-[600px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl select-none backdrop-blur-xl">
              {/* After (Generated result) - background layer */}
              <img
                src={resultImg}
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
                <img src={resultImg} alt="Try-On Result" className="max-h-[480px] object-contain rounded-2xl" />
              </div>
            </div>
          )}

          {/* Mandatory Realistic Simulation Disclaimer */}
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
