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
  Layers,
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
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale className="h-3 w-3" />
              <span>STYLE MATRIX</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              SIDE-BY-SIDE EVALUATION
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Style & Outfit Comparison
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Compare generated garments side-by-side to evaluate shoulder proportions, chest drape, silhouette fall, and color aesthetics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('saved')}
          className="aura-pill hover:bg-white/10 text-slate-300 transition"
        >
          <span>Manage Saved Archive →</span>
        </button>
      </div>

      {/* Look Selector Bar */}
      {savedLooks.length > 0 && (
        <div className="aura-panel p-5 space-y-3 shadow-xl">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
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
                  className={`flex-shrink-0 flex items-center gap-2.5 rounded-xl border p-2 transition duration-200 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/20 ring-2 ring-indigo-500/40 shadow-md'
                      : 'border-white/[0.08] bg-[#07080d]/80 hover:border-indigo-400/50'
                  }`}
                >
                  <img src={look.resultImageUrl} alt={look.garmentName} className="h-10 w-10 rounded-lg object-cover" />
                  <div className="text-left">
                    <p className="font-display text-xs font-semibold text-white max-w-[120px] truncate">{look.garmentName}</p>
                    <p className="font-mono text-[10px] text-slate-400 uppercase">{look.garmentCategory}</p>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'
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
        <div className="aura-panel p-16 text-center space-y-4 shadow-2xl">
          <Columns2 className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="font-display font-bold text-lg text-white">No Outfits Selected for Comparison</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Try on different garments and save the looks, or select saved looks above to see them side-by-side.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="flex items-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/15 px-5 py-2.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/25 transition"
            >
              <Camera className="h-4 w-4" />
              <span>Start Live Try-On</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-xs font-semibold text-white hover:opacity-95 transition shadow-lg shadow-indigo-600/30"
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
              className="aura-card p-4 flex flex-col justify-between group shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/40"
            >
              <div>
                {/* Look Image */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#030407] mb-4 border border-white/[0.08]">
                  <img src={look.resultImageUrl} alt={look.garmentName} className="h-full w-full object-contain" />
                  <span className="absolute top-3 left-3 rounded-lg bg-black/70 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-slate-300 backdrop-blur-md border border-white/10 uppercase">
                    {look.garmentCategory}
                  </span>
                </div>

                {/* Attributes */}
                <h3 className="font-display font-bold text-white text-base mb-1 truncate">{look.garmentName}</h3>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="font-mono text-slate-200 font-semibold">{look.priceINR ? `₹${look.priceINR.toLocaleString('en-IN')}` : 'N/A'}</span>
                  <span className="font-mono text-[10px]">{new Date(look.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs text-slate-300 space-y-1">
                  <p><strong>Fit Type:</strong> Tailored Contour</p>
                  <p><strong>Drape Target:</strong> Torso & Shoulders</p>
                  <p><strong>Category:</strong> {look.garmentCategory}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 mt-3 border-t border-white/[0.08]">
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
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] py-2 text-xs font-semibold text-slate-200 transition text-center backdrop-blur-md border border-white/[0.08]"
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
                    toast.success('Removed look from comparison');
                  }}
                  className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40 transition"
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
      <div className="aura-panel p-6 sm:p-8 space-y-4 shadow-2xl relative">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Style Inspiration & Drape Suggestions
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styleSuggestions.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-black/40 p-4">
              <h4 className="font-display text-xs font-bold text-white mb-1">{s.category}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{s.tip}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 italic">
          * Note: Style suggestions are algorithmic guidelines designed for visual inspiration, not definitive personal styling rules.
        </p>
      </div>
    </div>
  );
};
