import React, { useState } from 'react';
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
    navigate('live');
  };

  const handleStartPhoto = () => {
    setSelectedGarment(product);
    navigate('photo-upload');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <button type="button" onClick={() => navigate('home')} className="hover:text-white">Home</button>
        <span>/</span>
        <button type="button" onClick={() => navigate('gallery')} className="hover:text-white">Garments</button>
        <span>/</span>
        <span className="text-gray-200 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery & Zoom Preview (6 cols) */}
        <div className="md:col-span-6 space-y-4">
          <div className={`relative flex h-96 sm:h-[450px] items-center justify-center rounded-3xl bg-gradient-to-br ${product.swatch} p-8 border border-white/10 shadow-xl overflow-hidden`}>
            <img
              src={availableImages[activeImageIndex] || product.imageUrl}
              alt={product.name}
              className="max-h-80 max-w-full object-contain drop-shadow-2xl transition duration-300"
            />
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition ${
                isFav ? 'bg-red-500/80 text-white' : 'bg-black/40 text-gray-300 hover:bg-black/70'
              }`}
            >
              {isFav ? '❤️' : '🤍'}
            </button>
          </div>

          {/* Image Thumbnails */}
          {availableImages.length > 1 && (
            <div className="flex gap-3">
              {availableImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-20 w-20 rounded-2xl border p-2 bg-gray-900/60 transition ${
                    activeImageIndex === i
                      ? 'border-violet-500 ring-2 ring-violet-500/50'
                      : 'border-white/10 hover:border-violet-400'
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
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                {product.brand || 'Authentic Designer'}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-xs text-gray-400">SKU: {product.sku}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {product.name}
            </h1>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">₹{product.priceINR}</span>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 rounded-full px-2.5 py-0.5">
                In Stock & Try-On Ready
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed border-t border-b border-white/10 py-4">
            {product.description}
          </p>

          {/* Color Variations */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Available Colors: <span className="text-white">{product.colors[selectedColorIndex].name}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedColorIndex(index)}
                    title={color.name}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      selectedColorIndex === index
                        ? 'border-violet-400 ring-2 ring-violet-400/50 scale-110'
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
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Size:</span>
                <span className="text-xs text-violet-400 cursor-pointer hover:underline">Size & Fit Guide</span>
              </div>
              <div className="flex gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-xs font-bold transition border ${
                      selectedSize === s
                        ? 'border-violet-500 bg-violet-600 text-white shadow-md'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:border-violet-400'
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
                className="flex-1 rounded-2xl bg-violet-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-700/30 hover:bg-violet-500 transition flex items-center justify-center gap-2"
              >
                <span>📹 Try On in Live Camera</span>
              </button>

              <button
                type="button"
                onClick={handleStartPhoto}
                className="flex-1 rounded-2xl bg-purple-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-700/30 hover:bg-purple-500 transition flex items-center justify-center gap-2"
              >
                <span>✨ Try On with Photo</span>
              </button>
            </div>

            {product.retailerUrl && (
              <a
                href={product.retailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
              >
                🔗 Open Original Store Product Page ↗
              </a>
            )}
          </div>

          {/* Details & Specifications */}
          {product.details && product.details.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Specifications & Material</h4>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                {product.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
