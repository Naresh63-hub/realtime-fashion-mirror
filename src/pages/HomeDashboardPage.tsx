import React from 'react';
import {
  Camera,
  Image as ImageIcon,
  Link2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Heart,
  SlidersHorizontal,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';
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
      {/* Welcome Banner with Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/50 via-purple-950/30 to-gray-950/60 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30 mb-4 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Welcome back, {profile.name}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
            AI Virtual Fashion Try-On
          </h1>
          <p className="text-xs sm:text-base text-gray-300 mb-6 leading-relaxed">
            Real-time on-device body tracking and instant garment drape simulation. Choose your preferred input method below.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('live')}
              className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-700/30 hover:bg-violet-500 transition"
            >
              <Camera className="h-4 w-4" />
              <span>Start Live Try-On</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('photo-upload')}
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-xs sm:text-sm font-semibold text-gray-200 hover:bg-white/20 transition border border-white/10 backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Upload Your Photo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Input / Action Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span>Quick Actions</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate('live')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90 backdrop-blur-xl shadow-xl duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 mb-4 group-hover:scale-110 transition border border-violet-500/30">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-violet-300">Start Live Try-On</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Stand in front of your camera and see clothes track your movement in real-time.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90 backdrop-blur-xl shadow-xl duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 mb-4 group-hover:scale-110 transition border border-purple-500/30">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-purple-300">Upload Your Photo</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Upload any full-body or half-body portrait photo to simulate fit and drape.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90 backdrop-blur-xl shadow-xl duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 mb-4 group-hover:scale-110 transition border border-fuchsia-500/30">
              <Link2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-fuchsia-300">Paste Product URL</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Import clothing straight from Myntra, Amazon, Ajio, Zara, or Uniqlo product links.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-5 text-left transition hover:border-violet-500/60 hover:bg-gray-900/90 backdrop-blur-xl shadow-xl duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 mb-4 group-hover:scale-110 transition border border-emerald-500/30">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-emerald-300">Browse Clothing</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Explore catalog of shirts, t-shirts, jackets, tops, dresses, and kurtis.</p>
          </button>
        </div>
      </div>

      {/* Popular Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Shirt className="h-4 w-4 text-violet-400" />
            <span>Popular Categories</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate('gallery')}
              className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gray-900/50 p-4 text-center hover:border-violet-500/40 hover:bg-violet-950/20 transition group backdrop-blur-xl duration-200"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition">{cat.icon}</span>
              <span className="text-xs font-bold text-gray-200">{cat.label}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured / Quick Try-On Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>Featured Garments for Instant Try-On</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <span>Explore Full Gallery</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickPicks.map((product) => (
            <div
              key={product.id}
              className="rounded-3xl border border-white/10 bg-gray-900/70 p-4 flex flex-col justify-between hover:border-violet-500/40 transition backdrop-blur-xl shadow-xl duration-300"
            >
              <div>
                <div className={`mb-3 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br ${product.swatch} p-4 shadow-inner`}>
                  <img src={product.imageUrl} alt={product.name} className="max-h-32 object-contain drop-shadow" />
                </div>
                <div className="flex items-center justify-between text-xs text-violet-400 font-semibold mb-1">
                  <span>{product.brand}</span>
                  <span className="text-gray-200 font-bold">₹{product.priceINR}</span>
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    toast.success(`Loaded ${product.name} into Live Camera`);
                    navigate('live');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 shadow-md shadow-violet-600/30 transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Live Try-On</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    navigate('product-details', { productId: product.id });
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
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
        <div className="rounded-3xl border border-white/10 bg-gray-900/60 p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400 fill-current" />
              <span>Your Saved Looks ({savedLooks.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('saved')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <span>Open Gallery</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {savedLooks.slice(0, 4).map((look) => (
              <div
                key={look.id}
                onClick={() => navigate('saved')}
                className="cursor-pointer group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-[3/4]"
              >
                <img src={look.resultImageUrl} alt={look.garmentName} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 text-white">
                  <p className="text-xs font-bold truncate">{look.garmentName}</p>
                  <p className="text-[10px] text-gray-400">{new Date(look.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
