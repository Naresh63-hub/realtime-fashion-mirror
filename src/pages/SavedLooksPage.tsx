import React, { useState } from 'react';
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
    if (inspectLook?.id === id) setInspectLook(null);
  };

  const handleToggleFav = (id: string) => {
    StorageService.toggleFavoriteLook(id);
    refreshSavedLooks();
    if (inspectLook?.id === id) {
      setInspectLook((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleDownload = (look: SavedLook) => {
    const a = document.createElement('a');
    a.download = `${look.garmentName.replace(/\s+/g, '-').toLowerCase()}-${look.id}.png`;
    a.href = look.resultImageUrl;
    a.click();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved looks? This cannot be undone.')) {
      savedLooks.forEach((l) => StorageService.deleteLook(l.id));
      refreshSavedLooks();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>❤️</span>
            <span>Saved Looks Gallery</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Review your previously generated virtual try-on photographs, compare fits, and download favorites.
          </p>
        </div>

        {savedLooks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
            >
              Clear All Saved Looks
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'all'
              ? 'bg-violet-600 text-white shadow-md'
              : 'border border-white/10 bg-gray-900/60 text-gray-400 hover:text-white'
          }`}
        >
          All Looks ({savedLooks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'favorites'
              ? 'bg-violet-600 text-white shadow-md'
              : 'border border-white/10 bg-gray-900/60 text-gray-400 hover:text-white'
          }`}
        >
          Favorites Only ({savedLooks.filter((l) => l.isFavorite).length})
        </button>
      </div>

      {/* Grid or Empty State */}
      {displayedLooks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-900/40 p-12 text-center space-y-4">
          <p className="text-4xl">📸</p>
          <h3 className="text-base font-bold text-white">No Saved Looks Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {activeTab === 'favorites'
              ? 'You have not marked any looks as favorites yet.'
              : 'Capture a screenshot during live try-on or generate a look with your photo to save it here.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
            >
              📹 Try Live Camera
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/20 transition"
            >
              ✨ Upload Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedLooks.map((look) => (
            <div
              key={look.id}
              className="group rounded-3xl border border-white/10 bg-gray-900/70 p-4 flex flex-col justify-between hover:border-violet-500/40 transition shadow-lg"
            >
              <div>
                <div
                  onClick={() => setInspectLook(look)}
                  className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl bg-black mb-3"
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
                      look.isFavorite ? 'bg-red-500/90 text-white' : 'bg-black/40 text-gray-300 hover:bg-black/70'
                    }`}
                  >
                    {look.isFavorite ? '❤️' : '🤍'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-violet-400 font-semibold mb-1">
                  <span>{look.garmentCategory.toUpperCase()}</span>
                  <span className="text-gray-400 text-[10px]">{new Date(look.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-1">{look.garmentName}</h3>
                {look.priceINR && <p className="text-xs text-gray-300 font-bold mt-0.5">₹{look.priceINR}</p>}
              </div>

              <div className="flex gap-2 pt-3 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setInspectLook(look)}
                  className="flex-1 rounded-xl bg-white/10 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/20 transition"
                >
                  Inspect
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(look)}
                  className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
                  title="Download Image"
                >
                  📥
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(look.id)}
                  className="rounded-xl border border-red-500/20 bg-red-950/20 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 transition"
                  title="Delete Look"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectLook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setInspectLook(null)}
        >
          <div
            className="flex max-w-xl w-full flex-col gap-4 rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{inspectLook.garmentName}</h3>
                <p className="text-xs text-gray-400">Created on {new Date(inspectLook.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLook(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="aspect-[3/4] max-h-[60vh] rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-white/10">
              <img src={inspectLook.resultImageUrl} alt="Full view" className="h-full w-full object-contain" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleToggleFav(inspectLook.id)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 transition"
              >
                {inspectLook.isFavorite ? '❤️ Unfavorite' : '🤍 Add to Favorites'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    StorageService.toggleCompareLook(inspectLook.id);
                    navigate('compare');
                  }}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition"
                >
                  Compare Look ➔
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(inspectLook)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  Download Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
