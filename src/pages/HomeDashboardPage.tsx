import React from 'react';
import { useApp } from '../context/AppContext';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { ClothingCategory } from '../types';

export const HomeDashboardPage: React.FC = () => {
  const { navigate, savedLooks, profile, setSelectedGarment } = useApp();

  const categories = [
    { id: ClothingCategory.T_SHIRT, label: 'T-Shirts', icon: '👕', count: '12 styles' },
    { id: ClothingCategory.SHIRT, label: 'Shirts', icon: '👔', count: '8 styles' },
    { id: ClothingCategory.JACKET, label: 'Jackets', icon: '🧥', count: '6 styles' },
    { id: ClothingCategory.TOP, label: 'Tops', icon: '👚', count: '9 styles' },
    { id: ClothingCategory.KURTI, label: 'Kurtis', icon: '👘', count: '10 styles' },
    { id: ClothingCategory.DRESS, label: 'Dresses', icon: '👗', count: '7 styles' },
  ];

  const quickPicks = FULL_PRODUCT_CATALOG.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-gray-900/50 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30 mb-3">
            Welcome back, {profile.name}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            AI Virtual Fashion Try-On
          </h1>
          <p className="text-sm sm:text-base text-gray-300 mb-6">
            Real-time on-device body tracking and instant garment drape simulation. Choose your preferred input method below.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-violet-500 transition"
            >
              📹 Start Live Try-On
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-200 hover:bg-white/20 transition border border-white/10"
            >
              ✨ Upload Your Photo
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Input / Action Cards */}
      <div>
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡</span>
          <span>Quick Actions</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate('live')}
            className="group rounded-2xl border border-white/10 bg-gray-900/70 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 text-2xl mb-4 group-hover:scale-110 transition">
              📹
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-violet-300">Start Live Try-On</h3>
            <p className="text-xs text-gray-400">Stand in front of your camera and see clothes track your movement in real-time.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="group rounded-2xl border border-white/10 bg-gray-900/70 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 text-2xl mb-4 group-hover:scale-110 transition">
              🖼️
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-purple-300">Upload Your Photo</h3>
            <p className="text-xs text-gray-400">Upload any full-body or half-body portrait photo to simulate fit and drape.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="group rounded-2xl border border-white/10 bg-gray-900/70 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-600/20 text-fuchsia-400 text-2xl mb-4 group-hover:scale-110 transition">
              🔗
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-fuchsia-300">Paste Product URL</h3>
            <p className="text-xs text-gray-400">Import clothing straight from Myntra, Amazon, Ajio, Zara, or Uniqlo product links.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="group rounded-2xl border border-white/10 bg-gray-900/70 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 text-2xl mb-4 group-hover:scale-110 transition">
              👗
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-emerald-300">Browse Clothing</h3>
            <p className="text-xs text-gray-400">Explore catalog of shirts, t-shirts, jackets, tops, dresses, and kurtis.</p>
          </button>
        </div>
      </div>

      {/* Popular Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🏷️</span>
            <span>Popular Categories</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300"
          >
            View All →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate('gallery')}
              className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-gray-900/50 p-4 text-center hover:border-violet-500/40 hover:bg-violet-950/20 transition group"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition">{cat.icon}</span>
              <span className="text-xs font-bold text-gray-200">{cat.label}</span>
              <span className="text-[10px] text-gray-400">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured / Quick Try-On Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🔥</span>
            <span>Featured Garments for Instant Try-On</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300"
          >
            Explore Full Gallery →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickPicks.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-white/10 bg-gray-900/70 p-4 flex flex-col justify-between hover:border-violet-500/40 transition"
            >
              <div>
                <div className={`mb-3 flex h-36 items-center justify-center rounded-xl bg-gradient-to-br ${product.swatch} p-4`}>
                  <img src={product.imageUrl} alt={product.name} className="max-h-28 object-contain drop-shadow" />
                </div>
                <div className="flex items-center justify-between text-xs text-violet-400 font-semibold mb-1">
                  <span>{product.brand}</span>
                  <span className="text-gray-300 font-bold">₹{product.priceINR}</span>
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{product.description}</p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    navigate('live');
                  }}
                  className="flex-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
                >
                  Live Try-On
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    navigate('product-details', { productId: product.id });
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 transition"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Outfits Snippet */}
      {savedLooks.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>❤️</span>
              <span>Your Saved Looks ({savedLooks.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('saved')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300"
            >
              Open Gallery →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {savedLooks.slice(0, 4).map((look) => (
              <div
                key={look.id}
                onClick={() => navigate('saved')}
                className="cursor-pointer group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-[3/4]"
              >
                <img src={look.resultImageUrl} alt={look.garmentName} className="h-full w-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                  <p className="text-xs font-semibold truncate">{look.garmentName}</p>
                  <p className="text-[10px] text-gray-300">{new Date(look.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
