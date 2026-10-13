import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';
import { ClothingCategory, type Product } from '../types';

export const ClothingGalleryPage: React.FC = () => {
  const { navigate, setSelectedGarment, favoriteIds, toggleFavorite } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');

  const categories = [
    { id: 'all', label: 'All Items' },
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
    navigate('live');
  };

  const handleSelectForPhotoTryOn = (product: Product) => {
    setSelectedGarment(product);
    navigate('photo-upload');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>👗</span>
            <span>Clothing Catalog & Gallery</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse authentic garments ready for real-time body tracking or personal photograph try-on.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, brand, or style..."
            className="w-full rounded-xl border border-white/10 bg-gray-900/80 px-4 py-2 text-xs text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as ClothingCategory | 'all')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'border border-white/10 bg-gray-900/60 text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-900/40 p-12 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <h3 className="text-base font-bold text-white">No products found</h3>
          <p className="text-xs text-gray-400 mt-1">Try clearing your search query or selecting another category.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/20 transition"
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
                className="group rounded-3xl border border-white/10 bg-gray-900/70 p-4 flex flex-col justify-between hover:border-violet-500/50 hover:bg-gray-900/90 transition shadow-lg"
              >
                <div>
                  {/* Card Visual & Favorite Button */}
                  <div className="relative mb-4">
                    <div className={`flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br ${product.swatch} p-6 shadow-inner`}>
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="max-h-36 max-w-full object-contain drop-shadow-md group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition ${
                        isFav ? 'bg-red-500/80 text-white' : 'bg-black/40 text-gray-300 hover:bg-black/70'
                      }`}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>
                  </div>

                  {/* Brand & Price */}
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-violet-400">{product.brand}</span>
                    <span className="font-bold text-white text-sm">₹{product.priceINR}</span>
                  </div>

                  {/* Product Title */}
                  <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{product.name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
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
                      <span className="text-[10px] text-gray-400 ml-1">
                        {product.colors.length} colors
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectForTryOn(product)}
                      className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-600/20"
                    >
                      📹 Live Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectForPhotoTryOn(product)}
                      className="flex-1 rounded-xl bg-purple-600/80 py-2 text-xs font-semibold text-white hover:bg-purple-600 transition"
                    >
                      ✨ Photo Try-On
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGarment(product);
                      navigate('product-details', { productId: product.id });
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition"
                  >
                    View Product Details →
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
