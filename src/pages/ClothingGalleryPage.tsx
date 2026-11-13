import React, { useState, useMemo } from 'react';
import {
  Search,
  Heart,
  Camera,
  Sparkles,
  ShoppingBag,
  Eye,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { ClothingCategory, type Product } from '../types';

export const ClothingGalleryPage: React.FC = () => {
  const { navigate, setSelectedGarment, favoriteIds, toggleFavorite } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');

  const categories = [
    { id: 'all', label: 'All Garments' },
    { id: ClothingCategory.T_SHIRT, label: 'T-Shirts' },
    { id: ClothingCategory.SHIRT, label: 'Shirts' },
    { id: ClothingCategory.JACKET, label: 'Jackets' },
    { id: ClothingCategory.TOP, label: 'Tops' },
    { id: ClothingCategory.KURTI, label: 'Kurtis' },
    { id: ClothingCategory.DRESS, label: 'Dresses' },
  ];

  const filteredProducts = useMemo(() => {
    return FULL_PRODUCT_CATALOG.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchQuery =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [searchQuery, activeCategory]);

  const handleSelectForTryOn = (product: Product) => {
    setSelectedGarment(product);
    toast.success(`Selected ${product.name} for Live Try-On`);
    navigate('live');
  };

  const handleSelectForPhotoTryOn = (product: Product) => {
    setSelectedGarment(product);
    toast.success(`Selected ${product.name} for Photo Try-On`);
    navigate('photo-upload');
  };

  const handleToggleFav = (product: Product) => {
    const isNowFav = toggleFavorite(product.id);
    if (isNowFav) {
      toast.success(`Added ${product.name} to favorites ❤️`);
    } else {
      toast.info(`Removed ${product.name} from favorites`);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="aura-pill bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="h-3 w-3" />
              <span>COLLECTION 2026</span>
            </span>
            <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
              {FULL_PRODUCT_CATALOG.length} STYLES IN STUDIO
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Atelier Wardrobe & Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Curated designer silhouettes tailored for real-time skeletal drape and high-resolution generative AI diffusion.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search silhouettes, brands, colors..."
            className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f18]/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none backdrop-blur-xl transition shadow-inner"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as ClothingCategory | 'all')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'border border-white/[0.08] bg-[#0d0f18]/80 text-slate-300 hover:bg-white/[0.08] hover:text-white backdrop-blur-md'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="aura-panel p-16 text-center shadow-2xl">
          <Search className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-base text-white">No products found</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting another category.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isFav = favoriteIds.includes(product.id);
            return (
              <div
                key={product.id}
                className="aura-card p-4 flex flex-col justify-between group shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/40"
              >
                <div>
                  {/* Card Visual & Favorite Button */}
                  <div className="relative mb-4">
                    <div className={`relative flex h-52 items-center justify-center rounded-2xl bg-gradient-to-br ${product.swatch} p-6 shadow-inner overflow-hidden group`}>
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="max-h-40 max-w-full object-contain drop-shadow-xl group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-slate-300 uppercase">
                        {product.category}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFav(product)}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition ${
                        isFav ? 'bg-rose-500 text-white shadow-md shadow-rose-950/80' : 'bg-black/50 text-slate-300 hover:text-white hover:bg-black/80 border border-white/10'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Brand & Price */}
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-indigo-400 font-mono text-[11px] uppercase tracking-wider">{product.brand}</span>
                    <span className="font-mono font-bold text-white text-sm">₹{product.priceINR.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Product Title */}
                  <h3 className="font-display font-bold text-white text-base line-clamp-1 mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Color Swatches */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-4">
                      {product.colors.map((c, i) => (
                        <span
                          key={i}
                          title={c.name}
                          className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                      <span className="text-[10px] font-mono text-slate-400 ml-1">
                        {product.colors.length} shades
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectForTryOn(product)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/10 hover:bg-fuchsia-600/20 py-2 text-xs font-semibold text-fuchsia-300 transition"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Live Mirror</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectForPhotoTryOn(product)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-2 text-xs font-semibold text-white hover:opacity-95 transition shadow-md shadow-indigo-600/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Photo Fit</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGarment(product);
                      navigate('product-details', { productId: product.id });
                    }}
                    className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition backdrop-blur-md"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                    <span>View Specifications →</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
