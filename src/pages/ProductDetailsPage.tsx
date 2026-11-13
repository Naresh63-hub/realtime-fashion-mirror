import React, { useState } from 'react';
import {
  Heart,
  Camera,
  Sparkles,
  ExternalLink,
  Check,
  Ruler,
  Info,
  ChevronRight,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { getProductById, FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';

export const ProductDetailsPage: React.FC = () => {
  const { params, navigate, setSelectedGarment, favoriteIds, toggleFavorite } = useApp();

  const product = getProductById(params.productId || '') || FULL_PRODUCT_CATALOG[0];
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isFav = favoriteIds.includes(product.id);
  const availableImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];

  const handleStartLive = () => {
    setSelectedGarment(product);
    toast.success(`Selected ${product.name} for Live Try-On`);
    navigate('live');
  };

  const handleStartPhoto = () => {
    setSelectedGarment(product);
    toast.success(`Selected ${product.name} for Photo Try-On`);
    navigate('photo-upload');
  };

  const handleToggleFav = () => {
    const isNowFav = toggleFavorite(product.id);
    if (isNowFav) {
      toast.success(`Added ${product.name} to favorites ❤️`);
    } else {
      toast.info(`Removed ${product.name} from favorites`);
    }
  };

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <button type="button" onClick={() => navigate('home')} className="hover:text-white transition">Studio</button>
        <ChevronRight className="h-3 w-3 text-slate-600" />
        <button type="button" onClick={() => navigate('gallery')} className="hover:text-white transition">Wardrobe</button>
        <ChevronRight className="h-3 w-3 text-slate-600" />
        <span className="text-white font-semibold truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery & Zoom Preview (6 cols) */}
        <div className="md:col-span-6 space-y-4">
          <div className={`relative flex h-96 sm:h-[460px] items-center justify-center rounded-3xl bg-gradient-to-br ${product.swatch} p-8 border border-white/[0.08] shadow-2xl overflow-hidden backdrop-blur-2xl group`}>
            <img
              src={availableImages[activeImageIndex] || product.imageUrl}
              alt={product.name}
              className="max-h-80 max-w-full object-contain drop-shadow-2xl transition duration-300 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-300 uppercase">
              {product.category}
            </div>
            <button
              type="button"
              onClick={handleToggleFav}
              className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition ${
                isFav ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/80' : 'bg-black/50 text-slate-300 hover:text-white hover:bg-black/80 border border-white/10'
              }`}
            >
              <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Image Thumbnails */}
          {availableImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {availableImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-20 w-20 rounded-2xl border p-2 bg-[#07080d]/80 backdrop-blur-md transition flex-shrink-0 ${
                    activeImageIndex === i
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
                      : 'border-white/[0.08] hover:border-indigo-400/50'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Actions (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          <div className="aura-panel p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {product.brand || 'Authentic Atelier'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-xs text-slate-400">SKU: {product.sku}</span>
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                {product.name}
              </h1>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-black text-white">₹{product.priceINR.toLocaleString('en-IN')}</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 rounded-full px-3 py-1">
                  <Check className="h-3 w-3" />
                  <span>In Stock & Ready for Try-On</span>
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-b border-white/[0.08] py-4">
              {product.description}
            </p>

            {/* Color Variations */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Available Shades: <span className="text-white font-sans">{product.colors[selectedColorIndex].name}</span>
                </p>
                <div className="flex gap-2.5">
                  {product.colors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedColorIndex(index);
                        toast.info(`Selected color: ${color.name}`);
                      }}
                      title={color.name}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        selectedColorIndex === index
                          ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Select Size:</span>
                  <span className="flex items-center gap-1 text-xs text-indigo-400 cursor-pointer hover:underline">
                    <Ruler className="h-3.5 w-3.5" />
                    <span>Tailoring Guide</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSelectedSize(s);
                        toast.info(`Selected size: ${s}`);
                      }}
                      className={`h-10 min-w-10 rounded-xl px-3 font-mono text-xs font-bold transition border ${
                        selectedSize === s
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-indigo-400/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Virtual Try-On CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleStartLive}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/15 hover:bg-fuchsia-600/25 py-3.5 text-xs sm:text-sm font-semibold text-fuchsia-300 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>Try in Live Mirror</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartPhoto}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Try in Photo Fit</span>
                </button>
              </div>

              {product.retailerUrl && (
                <a
                  href={product.retailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition backdrop-blur-md"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Original Store Product Page ↗</span>
                </a>
              )}
            </div>

            {/* Details & Specifications */}
            {product.details && product.details.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">Specifications & Material</h4>
                </div>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  {product.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
