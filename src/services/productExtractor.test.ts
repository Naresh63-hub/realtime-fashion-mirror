import { describe, it, expect } from 'vitest';
import {
  validateProductUrl,
  inferCategoryFromText,
  extractProductFromUrl,
  getBackendApiUrl,
} from './productExtractor';
import { ClothingCategory } from '../types';

describe('Product URL Extractor Service', () => {
  it('resolves backend API URL safely with fallback', () => {
    const url = getBackendApiUrl();
    expect(url).toBeDefined();
    expect(url).toMatch(/^https?:\/\//);
    expect(url.endsWith('/')).toBe(false);
  });

  it('validates correct HTTP and HTTPS URLs', () => {
    expect(validateProductUrl('https://www.myntra.com/shirts/roadster/123').valid).toBe(true);
    expect(validateProductUrl('https://www.amazon.in/dp/B0812345').valid).toBe(true);
  });

  it('rejects empty or malformed URLs', () => {
    expect(validateProductUrl('').valid).toBe(false);
    expect(validateProductUrl('not-a-valid-url').valid).toBe(false);
  });

  it('rejects unsupported protocols (ftp, file, javascript)', () => {
    expect(validateProductUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateProductUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('blocks SSRF targets (localhost, 127.0.0.1, private IPs)', () => {
    expect(validateProductUrl('http://localhost:3000').valid).toBe(false);
    expect(validateProductUrl('http://127.0.0.1:8000').valid).toBe(false);
    expect(validateProductUrl('http://192.168.1.1').valid).toBe(false);
    expect(validateProductUrl('http://10.0.0.1/admin').valid).toBe(false);
    expect(validateProductUrl('http://169.254.169.254/latest/meta-data').valid).toBe(false);
  });

  it('correctly infers clothing category from title text', () => {
    expect(inferCategoryFromText('Men Slim Fit Casual Cotton Shirt')).toBe(ClothingCategory.SHIRT);
    expect(inferCategoryFromText('Women Plaid Anarkali Kurti with Tassels')).toBe(ClothingCategory.KURTI);
    expect(inferCategoryFromText('Faux Leather Moto Biker Jacket')).toBe(ClothingCategory.JACKET);
    expect(inferCategoryFromText('Crew Neck Organic Cotton Tee')).toBe(ClothingCategory.T_SHIRT);
    expect(inferCategoryFromText('Summer Floral Midi Tiered Dress')).toBe(ClothingCategory.DRESS);
    expect(inferCategoryFromText('Linen Sleeveless Crop Top')).toBe(ClothingCategory.TOP);
  });

  it('extracts fallback product info from URL slug', async () => {
    const product = await extractProductFromUrl('https://store.example.com/products/denim-indigo-shirt');
    expect(product.title).toBeDefined();
    expect(product.category).toBe(ClothingCategory.SHIRT);
    expect(product.images.length).toBeGreaterThan(0);
    expect(product.originalUrl).toBe('https://store.example.com/products/denim-indigo-shirt');
  });
});
