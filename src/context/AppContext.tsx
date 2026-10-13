/**
 * AppContext — Global state and navigation management for AI Fashion Mirror.
 *
 * Provides:
 * - Hash-based client-side router with deep linking
 * - Shared try-on session (garment selection, uploaded photo, result)
 * - Persisted user preferences, favorites, and saved looks
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Product, SavedLook, TryOnResult, UserPreferences, UserProfile } from '../types';
import { StorageService, DEFAULT_PREFERENCES, DEFAULT_PROFILE } from '../services/storageService';
import { getProductById, FULL_PRODUCT_CATALOG } from '../services/garmentCatalog';

export type AppRoute =
  | 'welcome'
  | 'home'
  | 'live'
  | 'photo-upload'
  | 'product-url'
  | 'gallery'
  | 'product-details'
  | 'results'
  | 'compare'
  | 'saved'
  | 'profile'
  | 'settings';

export interface RouteParams {
  productId?: string;
  garmentUrl?: string;
  garmentName?: string;
  sourceUrl?: string;
}

interface AppContextType {
  route: AppRoute;
  params: RouteParams;
  navigate: (route: AppRoute, params?: RouteParams) => void;
  goBack: () => void;
  // Shared Try-On Session
  selectedGarment: Product | null;
  setSelectedGarment: (garment: Product | null) => void;
  uploadedPhoto: string | null;
  setUploadedPhoto: (photo: string | null) => void;
  lastResult: TryOnResult | null;
  setLastResult: (result: TryOnResult | null) => void;
  // Persistence State
  savedLooks: SavedLook[];
  refreshSavedLooks: () => void;
  favoriteIds: string[];
  toggleFavorite: (productId: string) => boolean;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function parseHash(hash: string): { route: AppRoute; params: RouteParams } {
  const clean = hash.replace(/^#\/?/, '');
  if (!clean) return { route: 'home', params: {} };

  const [routePart, queryPart] = clean.split('?');
  const params: RouteParams = {};

  if (queryPart) {
    const sp = new URLSearchParams(queryPart);
    if (sp.has('id')) params.productId = sp.get('id')!;
    if (sp.has('garmentUrl')) params.garmentUrl = sp.get('garmentUrl')!;
    if (sp.has('garmentName')) params.garmentName = sp.get('garmentName')!;
    if (sp.has('sourceUrl')) params.sourceUrl = sp.get('sourceUrl')!;
  }

  // Handle path routes e.g. product-details/shirt-indigo
  const segments = routePart.split('/');
  const baseRoute = segments[0] as AppRoute;

  if (baseRoute === 'product-details' && segments[1]) {
    params.productId = segments[1];
  }

  const validRoutes: AppRoute[] = [
    'welcome',
    'home',
    'live',
    'photo-upload',
    'product-url',
    'gallery',
    'product-details',
    'results',
    'compare',
    'saved',
    'profile',
    'settings',
  ];

  const matched = validRoutes.includes(baseRoute) ? baseRoute : 'home';
  return { route: matched, params };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = parseHash(window.location.hash);
  const [route, setRoute] = useState<AppRoute>(initial.route);
  const [params, setParams] = useState<RouteParams>(initial.params);
  const [historyStack, setHistoryStack] = useState<Array<{ route: AppRoute; params: RouteParams }>>([]);

  // Session state
  const [selectedGarment, setSelectedGarment] = useState<Product | null>(() => {
    return initial.params.productId ? getProductById(initial.params.productId) || FULL_PRODUCT_CATALOG[0] : FULL_PRODUCT_CATALOG[0];
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TryOnResult | null>(null);

  // Persistence state
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(() => StorageService.getSavedLooks());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => StorageService.getFavoriteProductIds());
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => StorageService.getPreferences());
  const [profile, setProfileState] = useState<UserProfile>(() => StorageService.getProfile());

  // Listen to hash change for browser back/forward buttons
  useEffect(() => {
    const handleHash = () => {
      const parsed = parseHash(window.location.hash);
      setRoute(parsed.route);
      setParams(parsed.params);
      if (parsed.params.productId) {
        const prod = getProductById(parsed.params.productId);
        if (prod) setSelectedGarment(prod);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, nextParams: RouteParams = {}) => {
    setHistoryStack((prev) => [...prev, { route, params }]);
    setRoute(nextRoute);
    setParams(nextParams);

    // Update URL hash
    let hash = `#/${nextRoute}`;
    if (nextParams.productId) {
      hash += `?id=${encodeURIComponent(nextParams.productId)}`;
    }
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route, params]);

  const goBack = useCallback(() => {
    if (historyStack.length > 0) {
      const previous = historyStack[historyStack.length - 1];
      setHistoryStack((prev) => prev.slice(0, -1));
      setRoute(previous.route);
      setParams(previous.params);
      let hash = `#/${previous.route}`;
      if (previous.params.productId) hash += `?id=${encodeURIComponent(previous.params.productId)}`;
      window.location.hash = hash;
    } else {
      navigate('home');
    }
  }, [historyStack, navigate]);

  const refreshSavedLooks = useCallback(() => {
    setSavedLooks(StorageService.getSavedLooks());
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    const res = StorageService.toggleFavoriteProduct(productId);
    setFavoriteIds(StorageService.getFavoriteProductIds());
    return res;
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    const updated = StorageService.updatePreferences(patch);
    setPreferencesState(updated);
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    const updated = StorageService.updateProfile(patch);
    setProfileState(updated);
  }, []);

  return (
    <AppContext.Provider
      value={{
        route,
        params,
        navigate,
        goBack,
        selectedGarment,
        setSelectedGarment,
        uploadedPhoto,
        setUploadedPhoto,
        lastResult,
        setLastResult,
        savedLooks,
        refreshSavedLooks,
        favoriteIds,
        toggleFavorite,
        preferences,
        updatePreferences,
        profile,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
