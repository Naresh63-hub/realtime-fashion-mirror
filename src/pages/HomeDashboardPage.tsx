import React from 'react';
import {
  Camera,
  Image as ImageIcon,
  Link2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Heart,
  Shirt,
  Zap,
  Shield,
  Layers,
  Sparkle,
  Radio,
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-12">
      {/* Hero Showcase with Ambient Glow & Editorial Typography */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-br from-indigo-950/40 via-[#0d0f1a]/80 to-[#07080d] p-6 sm:p-12 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/15 via-rose-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Welcome back, {profile.name}</span>
              <span className="text-indigo-400/40">•</span>
              <span className="font-mono text-[11px] text-indigo-300">STUDIO READY</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Try Clothes. <br />
                <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">
                  See Yourself.
                </span> <br />
                Shop Smarter.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed pt-2">
                Real-time on-device 33-point body tracking and generative garment drape.
                Step in front of your live camera or upload a personal photo for instant virtual fitting.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>0ms Real-Time Latency</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>100% In-Browser Privacy</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>MediaPipe & WebGL2</span>
              </div>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('live')}
                className="group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-[0_4px_24px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_30px_rgba(99,102,241,0.6)] hover:brightness-110 transition-all duration-300 active:scale-[0.98] border border-white/20"
              >
                <Camera className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Launch Live AR Studio</span>
                <ArrowRight className="h-4 w-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => navigate('photo-upload')}
                className="flex items-center gap-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/[0.1] hover:text-white transition-all backdrop-blur-xl active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Photo Fitting Suite</span>
              </button>
            </div>
          </div>

          {/* Right Hero Graphic Showcase: Interactive Studio Mode Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* Live Studio Mini Card */}
            <div
              onClick={() => navigate('live')}
              className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-indigo-500/40 hover:bg-white/[0.06] p-4 transition-all duration-300 backdrop-blur-xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span>Real-Time AR Mirror</span>
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                  30 FPS Live
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step back 2 meters. Our on-device vision pipeline fits selected shirts, kurtis, and jackets directly over your video feed.
              </p>
              <div className="flex items-center justify-end text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 pt-2">
                <span>Start Camera →</span>
              </div>
            </div>

            {/* Photo Fit Studio Mini Card */}
            <div
              onClick={() => navigate('photo-upload')}
              className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-purple-500/40 hover:bg-white/[0.06] p-4 transition-all duration-300 backdrop-blur-xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Sparkle className="h-3.5 w-3.5 text-purple-400" />
                  <span>Photo Fit Studio</span>
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                  Photoreal AI
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your portrait or paste any retail URL (Zara, Myntra, Amazon) to drape garments with customized fit sliders.
              </p>
              <div className="flex items-center justify-end text-xs font-semibold text-purple-400 group-hover:text-purple-300 pt-2">
                <span>Upload Photo →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Input Modes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Studio Workflows</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Select Input Source</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Live Try-On */}
          <button
            type="button"
            onClick={() => navigate('live')}
            className="aura-card text-left p-6 rounded-3xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Camera className="h-20 w-20 text-indigo-400" />
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 mb-5 border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                Camera Feed
              </span>
              <h3 className="font-display font-bold text-white text-lg mt-0.5 mb-1.5 group-hover:text-indigo-200">
                Live AR Fitting
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step in front of your camera. See real-time 30 FPS clothing drape and gesture tracking.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 pt-5 group-hover:text-indigo-300">
              <span>Open Camera</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 2: Photo Upload */}
          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="aura-card text-left p-6 rounded-3xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ImageIcon className="h-20 w-20 text-purple-400" />
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 mb-5 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold">
                Still Portrait
              </span>
              <h3 className="font-display font-bold text-white text-lg mt-0.5 mb-1.5 group-hover:text-purple-200">
                Photo Fit Studio
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your portrait or select sample avatars to simulate drape, waist fit, and shoulder cuts.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 pt-5 group-hover:text-purple-300">
              <span>Upload Photo</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 3: URL Importer */}
          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="aura-card text-left p-6 rounded-3xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Link2 className="h-20 w-20 text-fuchsia-400" />
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 mb-5 border border-fuchsia-500/30 group-hover:scale-110 transition-transform">
                <Link2 className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-400 font-semibold">
                Store Links
              </span>
              <h3 className="font-display font-bold text-white text-lg mt-0.5 mb-1.5 group-hover:text-fuchsia-200">
                Import Retail Link
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extract clothing images directly from Zara, Myntra, Amazon, H&M, or Uniqlo product links.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-fuchsia-400 pt-5 group-hover:text-fuchsia-300">
              <span>Extract Link</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 4: Wardrobe Collection */}
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="aura-card text-left p-6 rounded-3xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShoppingBag className="h-20 w-20 text-emerald-400" />
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 mb-5 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Catalog
              </span>
              <h3 className="font-display font-bold text-white text-lg mt-0.5 mb-1.5 group-hover:text-emerald-200">
                Designer Wardrobe
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explore our curated library of designer shirts, tees, jackets, tops, kurtis, and dresses.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 pt-5 group-hover:text-emerald-300">
              <span>Browse Catalog</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Wardrobe Categories Carousel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shirt className="h-4 w-4 text-indigo-400" />
            <span>Garment Categories</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
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
              className="aura-card flex flex-col items-center justify-center rounded-2xl p-4 text-center group cursor-pointer"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                {cat.icon}
              </span>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white">{cat.label}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Instant Try-On Garments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Featured Garments for Instant Fitting</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate('gallery')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
          >
            <span>Explore Full Closet</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickPicks.map((product) => (
            <div
              key={product.id}
              className="aura-card rounded-3xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div
                  className={`mb-3 flex h-44 items-center justify-center rounded-2xl bg-gradient-to-br ${product.swatch} p-4 shadow-inner relative overflow-hidden`}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-36 object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                    ₹{product.priceINR}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                    {product.brand}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] capitalize">
                    {product.category}
                  </span>
                </div>
                <h3 className="font-display font-bold text-white text-sm line-clamp-1 group-hover:text-indigo-200">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    toast.success(`Loaded ${product.name} into Live Camera`);
                    navigate('live');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:brightness-110 transition active:scale-[0.98]"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Try Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGarment(product);
                    navigate('product-details', { productId: product.id });
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] hover:text-white transition backdrop-blur-md"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Looks Section (if any saved) */}
      {savedLooks.length > 0 && (
        <div className="aura-panel rounded-[2rem] p-6 sm:p-8 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500 fill-current" />
              <span>Your Saved Looks ({savedLooks.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('saved')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View Gallery</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {savedLooks.slice(0, 4).map((look) => (
              <div
                key={look.id}
                onClick={() => navigate('saved')}
                className="cursor-pointer group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 aspect-[3/4]"
              >
                <img
                  src={look.resultImageUrl}
                  alt={look.garmentName}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-white">
                  <p className="text-xs font-bold truncate">{look.garmentName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(look.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
