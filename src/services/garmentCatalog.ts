/**
 * Sample garment catalog.
 *
 * These are SVG silhouettes with real alpha channels served from
 * /public — the ClothingEngine pipeline (alpha mask → classify → anchors)
 * analyzes them like any product photo. Swap with real product images or
 * a backend catalog without touching any other module.
 */

import { ClothingCategory } from '../types';

export interface GarmentCatalogEntry {
  id: string;
  name: string;
  category: ClothingCategory;
  url: string;
  /** Tailwind accent classes for the catalog card. */
  swatch: string;
}

export const GARMENT_CATALOG: GarmentCatalogEntry[] = [
  {
    id: 'tee-forest',
    name: 'Forest Tee',
    category: ClothingCategory.T_SHIRT,
    url: '/garments/tee.svg',
    swatch: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'shirt-indigo',
    name: 'Indigo Shirt',
    category: ClothingCategory.SHIRT,
    url: '/garments/shirt.svg',
    swatch: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'jacket-charcoal',
    name: 'Charcoal Jacket',
    category: ClothingCategory.JACKET,
    url: '/garments/jacket.svg',
    swatch: 'from-slate-600 to-gray-800',
  },
  {
    id: 'top-rose',
    name: 'Rose Top',
    category: ClothingCategory.TOP,
    url: '/garments/top.svg',
    swatch: 'from-rose-400 to-pink-600',
  },
  {
    id: 'kurti-plum',
    name: 'Plum Kurti',
    category: ClothingCategory.KURTI,
    url: '/garments/kurti.svg',
    swatch: 'from-purple-500 to-fuchsia-600',
  },
];
