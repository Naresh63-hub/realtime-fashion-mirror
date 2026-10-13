/**
 * Sample garment and product catalog.
 *
 * Silhouettes with alpha channels served from /garments/
 * and full product metadata for commerce, gallery, and details views.
 */

import { ClothingCategory, type Product } from '../types';

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
  {
    id: 'dress-sapphire',
    name: 'Sapphire A-Line Dress',
    category: ClothingCategory.DRESS,
    url: '/garments/kurti.svg',
    swatch: 'from-blue-600 to-indigo-800',
  },
  {
    id: 'tee-classic-white',
    name: 'Minimalist White Tee',
    category: ClothingCategory.T_SHIRT,
    url: '/garments/tee.svg',
    swatch: 'from-gray-100 to-gray-300',
  },
  {
    id: 'jacket-leather-moto',
    name: 'Urban Biker Jacket',
    category: ClothingCategory.JACKET,
    url: '/garments/jacket.svg',
    swatch: 'from-zinc-700 to-stone-900',
  },
];

export const FULL_PRODUCT_CATALOG: Product[] = [
  {
    id: 'tee-forest',
    sku: 'TEE-FOR-01',
    name: 'Forest Green Combed Cotton Tee',
    category: ClothingCategory.T_SHIRT,
    priceINR: 799,
    description: 'Ultra-soft 180 GSM combed organic cotton t-shirt with ribbed crew neck and modern regular fit. Breathable all-day drape.',
    imageUrl: '/garments/tee.svg',
    swatch: 'from-emerald-500 to-teal-600',
    brand: 'Verde Studio',
    retailerUrl: 'https://brand.myshopify.com/products/forest-tee',
    images: ['/garments/tee.svg', '/garments/top.svg'],
    colors: [
      { name: 'Forest Green', hex: '#059669', imageUrl: '/garments/tee.svg' },
      { name: 'Pitch Black', hex: '#18181b', imageUrl: '/garments/tee.svg' },
      { name: 'Oatmeal', hex: '#e5e5e5', imageUrl: '/garments/tee.svg' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.8,
    inStock: true,
    details: ['100% Combed Cotton', 'Pre-shrunk fabric', 'Machine wash cold', 'Ethically manufactured in India'],
  },
  {
    id: 'shirt-indigo',
    sku: 'SHIRT-IND-02',
    name: 'Classic Indigo Oxford Denim Shirt',
    category: ClothingCategory.SHIRT,
    priceINR: 1899,
    description: 'Timeless button-down shirt woven from medium-weight indigo twill with dual breast pockets and curved hemline.',
    imageUrl: '/garments/shirt.svg',
    swatch: 'from-indigo-500 to-blue-600',
    brand: 'Avenue Stitch',
    retailerUrl: 'https://www.myntra.com/shirts/avenue-indigo/buy',
    images: ['/garments/shirt.svg', '/garments/tee.svg'],
    colors: [
      { name: 'Indigo Blue', hex: '#3730a3', imageUrl: '/garments/shirt.svg' },
      { name: 'Faded Stonewash', hex: '#60a5fa', imageUrl: '/garments/shirt.svg' },
      { name: 'Raw Black', hex: '#27272a', imageUrl: '/garments/shirt.svg' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.7,
    inStock: true,
    details: ['100% Ring-spun Cotton', 'Mother-of-pearl buttons', 'Button-down collar', 'Tailored slim-straight cut'],
  },
  {
    id: 'jacket-charcoal',
    sku: 'JKT-CHA-03',
    name: 'Charcoal Minimalist Bomber Jacket',
    category: ClothingCategory.JACKET,
    priceINR: 3499,
    description: 'Water-resistant lightweight windbreaker jacket with ribbed storm cuffs, metallic zip front, and concealed zip pockets.',
    imageUrl: '/garments/jacket.svg',
    swatch: 'from-slate-600 to-gray-800',
    brand: 'Nordic Craft',
    retailerUrl: 'https://www.zara.com/in/en/charcoal-bomber.html',
    images: ['/garments/jacket.svg', '/garments/shirt.svg'],
    colors: [
      { name: 'Charcoal Grey', hex: '#334155', imageUrl: '/garments/jacket.svg' },
      { name: 'Midnight Navy', hex: '#0f172a', imageUrl: '/garments/jacket.svg' },
      { name: 'Olive Drab', hex: '#3f6212', imageUrl: '/garments/jacket.svg' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.9,
    inStock: true,
    details: ['Water-repellent technical shell', 'Viscose interior lining', 'Two-way heavy duty YKK zipper'],
  },
  {
    id: 'top-rose',
    sku: 'TOP-ROS-04',
    name: 'Rose Quartz Sleeveless Linen Blouse',
    category: ClothingCategory.TOP,
    priceINR: 1199,
    description: 'Effortless relaxed-fit summer top crafted from airy European flax linen with a flattering scoop neckline.',
    imageUrl: '/garments/top.svg',
    swatch: 'from-rose-400 to-pink-600',
    brand: 'Aura Atelier',
    retailerUrl: 'https://www.ajio.com/rose-linen-top',
    images: ['/garments/top.svg', '/garments/tee.svg'],
    colors: [
      { name: 'Rose Quartz', hex: '#fb7185', imageUrl: '/garments/top.svg' },
      { name: 'Warm Terracotta', hex: '#ea580c', imageUrl: '/garments/top.svg' },
      { name: 'Ivory White', hex: '#f8fafc', imageUrl: '/garments/top.svg' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    rating: 4.6,
    inStock: true,
    details: ['100% Certified European Flax Linen', 'Hypoallergenic and breathable', 'Gentle hand wash'],
  },
  {
    id: 'kurti-plum',
    sku: 'KUR-PLU-05',
    name: 'Plum Chanderi Silk Festive Kurti',
    category: ClothingCategory.KURTI,
    priceINR: 2499,
    description: 'Exquisite straight-fit ethnic kurti with gold thread embroidery around the mandarin collar and subtle side slits.',
    imageUrl: '/garments/kurti.svg',
    swatch: 'from-purple-500 to-fuchsia-600',
    brand: 'Riti Heritage',
    retailerUrl: 'https://www.myntra.com/kurtis/riti-plum/buy',
    images: ['/garments/kurti.svg', '/garments/top.svg'],
    colors: [
      { name: 'Plum Purple', hex: '#9333ea', imageUrl: '/garments/kurti.svg' },
      { name: 'Emerald Teal', hex: '#0d9488', imageUrl: '/garments/kurti.svg' },
      { name: 'Ruby Crimson', hex: '#be123c', imageUrl: '/garments/kurti.svg' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.9,
    inStock: true,
    details: ['Chanderi Silk Blend with Cotton Lining', 'Zari embroidery detailing', 'Mandarin neckline with faux buttons'],
  },
  {
    id: 'dress-sapphire',
    sku: 'DRS-SAP-06',
    name: 'Sapphire Midnight Tiered Midi Dress',
    category: ClothingCategory.DRESS,
    priceINR: 2899,
    description: 'Flowing tiered A-line dress featuring a gentle waist cincher and breathable crepe weave, perfect for evening gatherings.',
    imageUrl: '/garments/kurti.svg',
    swatch: 'from-blue-600 to-indigo-800',
    brand: 'Velvet Horizon',
    retailerUrl: 'https://www.zara.com/in/en/sapphire-dress.html',
    images: ['/garments/kurti.svg', '/garments/top.svg'],
    colors: [
      { name: 'Sapphire Midnight', hex: '#1e3a8a', imageUrl: '/garments/kurti.svg' },
      { name: 'Wine Red', hex: '#881337', imageUrl: '/garments/kurti.svg' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    rating: 4.8,
    inStock: true,
    details: ['Georgette Crepe fabric', 'Concealed side zipper', 'Soft internal lining', 'Mid-calf tiered hem'],
  },
];

export function getProductById(id: string): Product | undefined {
  return FULL_PRODUCT_CATALOG.find((p) => p.id === id);
}

export function getProductsByCategory(category: ClothingCategory | 'all'): Product[] {
  if (category === 'all') return FULL_PRODUCT_CATALOG;
  return FULL_PRODUCT_CATALOG.filter((p) => p.category === category);
}

export function searchProducts(query: string, category?: ClothingCategory | 'all'): Product[] {
  const q = query.toLowerCase().trim();
  let list = FULL_PRODUCT_CATALOG;
  if (category && category !== 'all') {
    list = list.filter((p) => p.category === category);
  }
  if (!q) return list;
  return list.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
  );
}
