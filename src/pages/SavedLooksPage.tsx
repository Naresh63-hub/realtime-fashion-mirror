import React, { useState } from 'react';
import {
  Heart,
  Download,
  Trash2,
  Maximize2,
  Sparkles,
  Camera,
  Scale,
  X,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';
import type { SavedLook } from '../types';

export const SavedLooksPage: React.FC = () => {
  const { savedLooks, refreshSavedLooks, navigate } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [inspectLook, setInspectLook] = useState<SavedLook | null>(null);

  const displayedLooks = savedLooks.filter((l) => (activeTab === 'all' ? true : l.isFavorite));

  const handleDelete = (id: string) => {
    StorageService.deleteLook(id);
    refreshSavedLooks();
    toast.success('Look deleted successfully.');
    if (inspectLook?.id === id) setInspectLook(null);
  };

  const handleToggleFav = (id: string) => {
    const isFav = StorageService.toggleFavoriteLook(id);
    refreshSavedLooks();
    if (isFav) {
      toast.success('Added to favorites ❤️');
    } else {
      toast.info('Removed from favorites');
    }
    if (inspectLook?.id === id) {
      setInspectLook((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleDownload = (look: SavedLook) => {
    const a = document.createElement('a');
    a.download = `${look.garmentName.replace(/\s+/g, '-').toLowerCase()}-${look.id}.png`;
    a.href = look.resultImageUrl;
    a.click();
    toast.success('Look downloaded to your device!');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved looks? This cannot be undone.')) {
      savedLooks.forEach((l) => StorageService.deleteLook(l.id));
      refreshSavedLooks();
      toast.info('All saved looks cleared.');
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Heart className="h-3 w-3 fill-current" />
              <span>SAVED ARCHIVE</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              {savedLooks.length} LOOKS PRESERVED
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Saved Looks Gallery
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Review your captured and generated virtual fittings, manage favorites, compare cuts side-by-side, and download high-res snapshots.
          </p>
        </div>

        {savedLooks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition backdrop-blur-md"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All Saved Looks</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition duration-200 ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-600/30'
              : 'border border-white/[0.08] bg-[#0d0f18]/80 text-slate-400 hover:text-white backdrop-blur-md'
          }`}
        >
          All Looks ({savedLooks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition duration-200 ${
            activeTab === 'favorites'
              ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-600/30'
              : 'border border-white/[0.08] bg-[#0d0f18]/80 text-slate-400 hover:text-white backdrop-blur-md'
          }`}
        >
          Favorites Only ({savedLooks.filter((l) => l.isFavorite).length})
        </button>
      </div>

      {/* Grid or Empty State */}
      {displayedLooks.length === 0 ? (
        <div className="aura-panel p-16 text-center space-y-4 shadow-2xl">
          <Heart className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="font-display font-bold text-lg text-white">No Saved Looks Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'favorites'
              ? 'You have not marked any looks as favorites yet.'
              : 'Capture a screenshot during live try-on or generate a look with your photo to save it here.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="flex items-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/15 px-5 py-2.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/25 transition"
            >
              <Camera className="h-4 w-4" />
              <span>Try Live Camera</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-xs font-semibold text-white hover:opacity-95 transition shadow-lg shadow-indigo-600/30"
            >
              <Sparkles className="h-4 w-4" />
              <span>Upload Photo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedLooks.map((look) => (
            <div
              key={look.id}
              className="aura-card p-4 flex flex-col justify-between group shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/40"
            >
              <div>
                <div
                  onClick={() => setInspectLook(look)}
                  className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl bg-[#030407] mb-3 border border-white/[0.08]"
                >
                  <img
                    src={look.resultImageUrl}
                    alt={look.garmentName}
                    className="h-full w-full object-contain group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFav(look.id);
                    }}
                    className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition ${
                      look.isFavorite ? 'bg-rose-500 text-white shadow-md shadow-rose-950/80' : 'bg-black/50 text-slate-300 hover:text-white hover:bg-black/80 border border-white/10'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${look.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-1">
                  <span className="font-mono text-[10px] uppercase">{look.garmentCategory}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{new Date(look.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-display font-bold text-white text-sm line-clamp-1">{look.garmentName}</h3>
                {look.priceINR && <p className="font-mono text-xs text-slate-300 font-bold mt-0.5">₹{look.priceINR.toLocaleString('en-IN')}</p>}
              </div>

              <div className="flex gap-2 pt-3 mt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setInspectLook(look)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] py-1.5 text-xs font-semibold text-slate-200 transition backdrop-blur-md border border-white/[0.08]"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Inspect</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(look)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] transition backdrop-blur-md"
                  title="Download Image"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(look.id)}
                  className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40 transition"
                  title="Delete Look"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectLook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-fade-in"
          onClick={() => setInspectLook(null)}
        >
          <div
            className="flex max-w-xl w-full flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[#0d0f18]/95 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-display font-bold text-white text-base">{inspectLook.garmentName}</h3>
                <p className="font-mono text-xs text-slate-400">Created on {new Date(inspectLook.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLook(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-[3/4] max-h-[60vh] rounded-2xl bg-[#030407] overflow-hidden flex items-center justify-center border border-white/[0.08]">
              <img src={inspectLook.resultImageUrl} alt="Full view" className="h-full w-full object-contain" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleToggleFav(inspectLook.id)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
              >
                <Heart className={`h-3.5 w-3.5 ${inspectLook.isFavorite ? 'fill-current text-rose-500' : ''}`} />
                <span>{inspectLook.isFavorite ? 'Unfavorite' : 'Add to Favorites'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    StorageService.toggleCompareLook(inspectLook.id);
                    toast.success('Added to outfit comparison!');
                    navigate('compare');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition shadow-md shadow-indigo-600/30"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>Compare Look ➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(inspectLook)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.08] transition backdrop-blur-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
