import React, { useState } from 'react';
import {
  Columns2,
  Trash2,
  Lightbulb,
  Plus,
  Check,
  Scale,
  Sparkles,
  Camera,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import type { SavedLook } from '../types';

export const StyleComparisonPage: React.FC = () => {
  const { savedLooks, navigate, refreshSavedLooks } = useApp();
  const compareIds = StorageService.getCompareList();

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (compareIds.length > 0) return compareIds;
    return savedLooks.slice(0, 2).map((l) => l.id);
  });

  const activeLooks: SavedLook[] = selectedIds
    .map((id) => savedLooks.find((l) => l.id === id))
    .filter((l): l is SavedLook => Boolean(l));

  const toggleSelectLook = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((x) => x !== id));
        toast.info('Removed from comparison view');
      } else {
        toast.error('At least one outfit must remain in the comparison view.');
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
        toast.success('Added to comparison view');
      } else {
        toast.warning('Maximum 4 outfits can be compared simultaneously.');
      }
    }
  };

  const styleSuggestions = [
    {
      category: 'Contrast Balance',
      tip: 'Pairing deep indigo or charcoal jackets with lighter neutral tops creates a balanced focal point.',
    },
    {
      category: 'Silhouette Drape',
      tip: 'Straight-cut kurtis or structured blazers elongate posture when paired with tapered bottoms.',
    },
    {
      category: 'Color Harmony',
      tip: 'Earth tones like Forest Green and Warm Terracotta complement warm ambient lighting beautifully.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Scale className="h-4 w-4" />
            </div>
            <span>Style & Outfit Comparison</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Compare generated outfits side-by-side to evaluate drape, collar fit, and color combinations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('saved')}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
        >
          <span>Manage All Saved Looks →</span>
        </button>
      </div>

      {/* Look Selector Bar */}
      {savedLooks.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-xl shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Select Up to 4 Looks to Compare (Currently {selectedIds.length} Selected):
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {savedLooks.map((look) => {
              const isSelected = selectedIds.includes(look.id);
              return (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => toggleSelectLook(look.id)}
                  className={`flex-shrink-0 flex items-center gap-2.5 rounded-2xl border p-2 transition duration-200 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-950/40 ring-2 ring-violet-500/40'
                      : 'border-white/10 bg-white/5 hover:border-violet-400'
                  }`}
                >
                  <img src={look.resultImageUrl} alt={look.garmentName} className="h-10 w-10 rounded-xl object-cover" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white max-w-[120px] truncate">{look.garmentName}</p>
                    <p className="text-[10px] text-gray-400">{look.garmentCategory}</p>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      {activeLooks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-900/40 p-12 text-center space-y-4 backdrop-blur-xl">
          <Columns2 className="h-12 w-12 text-gray-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Outfits Selected for Comparison</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Try on different garments and save the looks, or select saved looks above to see them side-by-side.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/30"
            >
              <Camera className="h-4 w-4" />
              <span>Start Live Try-On</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/20 transition backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Photo Try-On</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeLooks.length >= 3 ? 'lg:grid-cols-3' : ''} ${activeLooks.length === 4 ? 'xl:grid-cols-4' : ''} gap-6`}>
          {activeLooks.map((look) => (
            <div
              key={look.id}
              className="rounded-3xl border border-white/10 bg-gray-900/70 p-4 flex flex-col justify-between hover:border-violet-500/40 transition shadow-2xl backdrop-blur-xl duration-300"
            >
              <div>
                {/* Look Image */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black mb-4 border border-white/5">
                  <img src={look.resultImageUrl} alt={look.garmentName} className="h-full w-full object-contain" />
                  <span className="absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-white/10">
                    {look.garmentCategory.toUpperCase()}
                  </span>
                </div>

                {/* Attributes */}
                <h3 className="font-bold text-white text-base mb-1 truncate">{look.garmentName}</h3>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>Price: {look.priceINR ? `₹${look.priceINR}` : 'N/A'}</span>
                  <span>{new Date(look.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-xs text-gray-300 space-y-1">
                  <p><strong>Fit Type:</strong> Regular / Relaxed</p>
                  <p><strong>Drape Target:</strong> Torso & Shoulders</p>
                  <p><strong>Category:</strong> {look.garmentCategory}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const prod = FULL_PRODUCT_CATALOG.find((p) => p.id === look.garmentId);
                    if (prod) {
                      navigate('product-details', { productId: prod.id });
                    } else {
                      navigate('gallery');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold text-gray-200 hover:bg-white/20 transition text-center backdrop-blur-md"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    StorageService.deleteLook(look.id);
                    setSelectedIds((prev) => prev.filter((id) => id !== look.id));
                    refreshSavedLooks();
                    toast.success('Removed look from saved library');
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 transition"
                  title="Remove Look"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Style Suggestions Notice */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/30 to-purple-950/20 p-6 space-y-4 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300">
            Style Inspiration & Drape Suggestions
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styleSuggestions.map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-black/40 p-4">
              <h4 className="text-xs font-bold text-white mb-1">{s.category}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{s.tip}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 italic">
          * Note: Style suggestions are algorithmic guidelines designed for visual inspiration, not definitive personal styling rules.
        </p>
      </div>
    </div>
  );
};
