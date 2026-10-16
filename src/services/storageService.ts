/**
 * StorageService — Local persistence layer for AI Fashion Mirror.
 *
 * Implements privacy-by-default:
 * - Stores saved try-on looks, user preferences, favorites, and comparison items.
 * - Everything stays local in the user's browser by default (localStorage).
 * - Provides full data export (JSON) and complete local data erasure.
 */

import type { SavedLook, UserPreferences, UserProfile, Product } from '../types';
import { ClothingCategory } from '../types';

const STORAGE_KEYS = {
  SAVED_LOOKS: 'afm_saved_looks_v1',
  FAVORITES: 'afm_favorite_product_ids_v1',
  PREFERENCES: 'afm_user_preferences_v1',
  PROFILE: 'afm_user_profile_v1',
  RECENT_PRODUCTS: 'afm_recent_products_v1',
  COMPARE_LIST: 'afm_compare_looks_v1',
} as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  cameraResolution: '720p',
  preferredFacingMode: 'user',
  mirrorUserCamera: true,
  smoothingFactor: 0.7,
  confidenceThreshold: 0.5,
  showLandmarksByDefault: false,
  inferenceMode: 'client-high-res',
  cloudVtonApiUrl: '',
  storagePreference: 'local',
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user_local_default',
  name: 'Fashion Enthusiast',
  email: '',
  preferences: DEFAULT_PREFERENCES,
  totalTryOns: 0,
  memberSince: Date.now(),
};

export class StorageService {
  // -------------------------------------------------------------------------
  // Saved Looks
  // -------------------------------------------------------------------------
  static getSavedLooks(): SavedLook[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_LOOKS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveLook(look: Omit<SavedLook, 'id' | 'createdAt'>): SavedLook {
    const list = this.getSavedLooks();
    const newLook: SavedLook = {
      ...look,
      id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      isFavorite: look.isFavorite ?? false,
    };
    list.unshift(newLook);

    // Bound total saved looks to prevent browser storage exhaustion
    const MAX_SAVED_LOOKS = 15;
    const trimmed = list.slice(0, MAX_SAVED_LOOKS);

    let saved = false;
    while (!saved && trimmed.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED_LOOKS, JSON.stringify(trimmed));
        this.incrementTryOnCount();
        saved = true;
      } catch {
        // Quota exceeded: evict oldest non-favorite look first
        const nonFavIdx = trimmed.findLastIndex((l) => !l.isFavorite);
        if (nonFavIdx > 0) {
          trimmed.splice(nonFavIdx, 1);
        } else {
          trimmed.pop();
        }
      }
    }
    return newLook;
  }

  static deleteLook(lookId: string): boolean {
    try {
      const list = this.getSavedLooks().filter((l) => l.id !== lookId);
      localStorage.setItem(STORAGE_KEYS.SAVED_LOOKS, JSON.stringify(list));
      // Also remove from compare list if present
      this.removeFromCompare(lookId);
      return true;
    } catch {
      return false;
    }
  }

  static toggleFavoriteLook(lookId: string): boolean {
    const list = this.getSavedLooks();
    const target = list.find((l) => l.id === lookId);
    if (!target) return false;
    target.isFavorite = !target.isFavorite;
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LOOKS, JSON.stringify(list));
      return target.isFavorite;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Product Favorites
  // -------------------------------------------------------------------------
  static getFavoriteProductIds(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static isProductFavorite(productId: string): boolean {
    return this.getFavoriteProductIds().includes(productId);
  }

  static toggleFavoriteProduct(productId: string): boolean {
    const favorites = new Set(this.getFavoriteProductIds());
    let nowFavorite = false;
    if (favorites.has(productId)) {
      favorites.delete(productId);
    } else {
      favorites.add(productId);
      nowFavorite = true;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favorites)));
    } catch (err) {
      console.warn('Failed to save favorite:', err);
    }
    return nowFavorite;
  }

  // -------------------------------------------------------------------------
  // User Preferences & Profile
  // -------------------------------------------------------------------------
  static getPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  static updatePreferences(patch: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...patch };
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update preferences:', err);
    }
    return updated;
  }

  static getProfile(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!raw) return { ...DEFAULT_PROFILE, preferences: this.getPreferences() };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PROFILE, ...parsed, preferences: this.getPreferences() };
    } catch {
      return { ...DEFAULT_PROFILE, preferences: this.getPreferences() };
    }
  }

  static updateProfile(patch: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...patch };
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update profile:', err);
    }
    return updated;
  }

  static incrementTryOnCount(): void {
    const profile = this.getProfile();
    profile.totalTryOns = (profile.totalTryOns || 0) + 1;
    this.updateProfile(profile);
  }

  // -------------------------------------------------------------------------
  // Recently Viewed Products
  // -------------------------------------------------------------------------
  static getRecentProducts(): Product[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_PRODUCTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static addRecentProduct(product: Product): void {
    const list = this.getRecentProducts().filter((p) => p.id !== product.id);
    list.unshift(product);
    const trimmed = list.slice(0, 10);
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT_PRODUCTS, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Failed to update recent products:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Compare List
  // -------------------------------------------------------------------------
  static getCompareList(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPARE_LIST);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static toggleCompareLook(lookId: string): boolean {
    const list = this.getCompareList();
    let updated: string[];
    let inList = false;
    if (list.includes(lookId)) {
      updated = list.filter((id) => id !== lookId);
    } else {
      // Limit to 4 items max for side-by-side comparison
      updated = [...list.slice(0, 3), lookId];
      inList = true;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.COMPARE_LIST, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return inList;
  }

  static removeFromCompare(lookId: string): void {
    const list = this.getCompareList().filter((id) => id !== lookId);
    try {
      localStorage.setItem(STORAGE_KEYS.COMPARE_LIST, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  static clearCompareList(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.COMPARE_LIST);
    } catch {
      // ignore
    }
  }

  // -------------------------------------------------------------------------
  // Data Export & Purge (Privacy & GDPR compliance)
  // -------------------------------------------------------------------------
  static exportAllData(): string {
    const payload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile: this.getProfile(),
      preferences: this.getPreferences(),
      savedLooks: this.getSavedLooks(),
      favoriteProductIds: this.getFavoriteProductIds(),
      recentProducts: this.getRecentProducts(),
    };
    return JSON.stringify(payload, null, 2);
  }

  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  }
}
