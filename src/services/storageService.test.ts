import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';
import { ClothingCategory } from '../types';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves looks', () => {
    expect(StorageService.getSavedLooks()).toEqual([]);

    const saved = StorageService.saveLook({
      title: 'Test Look',
      personImageUrl: 'data:image/png;base64,123',
      resultImageUrl: 'data:image/png;base64,456',
      garmentId: 'tee-01',
      garmentName: 'Forest Tee',
      garmentCategory: ClothingCategory.T_SHIRT,
      garmentImageUrl: '/garments/tee.svg',
      isFavorite: false,
    });

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Test Look');

    const list = StorageService.getSavedLooks();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(saved.id);
  });

  it('deletes saved looks', () => {
    const look = StorageService.saveLook({
      title: 'To Delete',
      personImageUrl: 'data:image/png;base64,123',
      resultImageUrl: 'data:image/png;base64,456',
      garmentId: 'tee-01',
      garmentName: 'Forest Tee',
      garmentCategory: ClothingCategory.T_SHIRT,
      garmentImageUrl: '/garments/tee.svg',
      isFavorite: false,
    });

    expect(StorageService.getSavedLooks().length).toBe(1);
    const deleted = StorageService.deleteLook(look.id);
    expect(deleted).toBe(true);
    expect(StorageService.getSavedLooks().length).toBe(0);
  });

  it('toggles product favorites', () => {
    expect(StorageService.isProductFavorite('tee-forest')).toBe(false);

    const nowFav = StorageService.toggleFavoriteProduct('tee-forest');
    expect(nowFav).toBe(true);
    expect(StorageService.isProductFavorite('tee-forest')).toBe(true);

    const unfav = StorageService.toggleFavoriteProduct('tee-forest');
    expect(unfav).toBe(false);
    expect(StorageService.isProductFavorite('tee-forest')).toBe(false);
  });

  it('updates preferences and profile', () => {
    const updated = StorageService.updatePreferences({ cameraResolution: '1080p', smoothingFactor: 0.85 });
    expect(updated.cameraResolution).toBe('1080p');
    expect(updated.smoothingFactor).toBe(0.85);

    const prof = StorageService.updateProfile({ name: 'Aria Sharma' });
    expect(prof.name).toBe('Aria Sharma');
  });

  it('exports all user data as JSON string', () => {
    StorageService.saveLook({
      title: 'Export Test Look',
      personImageUrl: 'data:image/png;base64,123',
      resultImageUrl: 'data:image/png;base64,456',
      garmentId: 'tee-01',
      garmentName: 'Forest Tee',
      garmentCategory: ClothingCategory.T_SHIRT,
      garmentImageUrl: '/garments/tee.svg',
      isFavorite: true,
    });

    const exported = StorageService.exportAllData();
    expect(typeof exported).toBe('string');
    const parsed = JSON.parse(exported);
    expect(parsed.version).toBe('1.0');
    expect(parsed.savedLooks.length).toBe(1);
  });
});
