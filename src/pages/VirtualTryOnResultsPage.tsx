import React, { useState } from 'react';
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
  const [savedSuccess, setSavedSuccess] = useState(false);
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
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
    navigate('compare');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30">
            Synthesis Complete
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2">
            <span>🎉</span>
            <span>Virtual Try-On Result</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Drape preview anchored to body proportions via {lastResult?.modelUsed || 'High-Resolution Mesh Warp'}.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-gray-900 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'slider' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            ↔️ Interactive Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'side-by-side' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            🔲 Side by Side
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 flex items-center justify-between">
          <span>✓ Look saved to your private gallery! You can review or compare it anytime.</span>
          <button type="button" onClick={() => navigate('saved')} className="underline">View in Saved Looks →</button>
        </div>
      )}

      {/* Main Comparison Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Comparison Area (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {viewMode === 'slider' ? (
            <div className="relative aspect-[3/4] max-h-[600px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl select-none">
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
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-md text-xs font-bold">
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
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                Original Photo
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-violet-600/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                Virtual Try-On
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-3 flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-2 font-semibold">Original Photograph</span>
                <img src={personImg} alt="Original" className="max-h-[480px] object-contain rounded-xl" />
              </div>
              <div className="rounded-2xl border border-violet-500/40 bg-black/60 p-3 flex flex-col items-center">
                <span className="text-xs text-violet-400 mb-2 font-semibold">Virtual Try-On Result</span>
                <img src={resultImg} alt="Try-On Result" className="max-h-[480px] object-contain rounded-xl" />
              </div>
            </div>
          )}

          {/* Mandatory Realistic Simulation Disclaimer */}
          <p className="text-[11px] text-gray-400 leading-relaxed bg-white/5 border border-white/5 rounded-xl p-3">
            ⚠️ <strong>Virtual Try-On Preview:</strong> This visualization simulates garment placement and body drape using computer vision and geometric mesh warping. Real-world fabric stretch, drape, and texture may vary.
          </p>
        </div>

        {/* Right: Selected Product Details & Next Steps (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Tried-On Garment
            </h3>

            <div className="flex items-center gap-3">
              <div className={`h-20 w-20 rounded-xl bg-gradient-to-br ${garment.swatch} p-2 flex items-center justify-center flex-shrink-0`}>
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
                className="w-full rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500 shadow-md shadow-violet-600/30 transition flex items-center justify-center gap-2"
              >
                <span>❤️</span>
                <span>Save Look to Gallery</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-gray-200 hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>Download Result Image</span>
              </button>

              <button
                type="button"
                onClick={handleCompareOutfits}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-gray-200 hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <span>⚖️</span>
                <span>Compare Outfits</span>
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="rounded-3xl border border-white/10 bg-gray-900/40 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Try Another Style</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('gallery')}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition text-center"
              >
                Browse Garments
              </button>
              <button
                type="button"
                onClick={() => navigate('photo-upload')}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition text-center"
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
