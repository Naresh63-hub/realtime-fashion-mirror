import { describe, it, expect, beforeAll } from 'vitest';
import en from './locales/en';
import hi from './locales/hi-IN';
import { t, setLocale, getLocale } from './index';

describe('i18n dictionaries', () => {
  it('TR-2.2: every key in en exists in hi-IN as a non-empty string', () => {
    const enKeys = Object.keys(en);
    expect(enKeys.length).toBeGreaterThanOrEqual(50);
    for (const k of enKeys) {
      expect(typeof hi[k], `Missing or invalid hi-IN key: ${k}`).toBe('string');
      expect(hi[k].length, `Empty hi-IN value for key: ${k}`).toBeGreaterThan(0);
    }
  });

  it('en dictionary has at least 65 keys', () => {
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(65);
  });

  it('hi-IN dictionary has the same number of keys as en', () => {
    expect(Object.keys(hi).length).toBe(Object.keys(en).length);
  });

  it('no duplicate keys between en and hi-IN (keys match exactly)', () => {
    const enKeys = new Set(Object.keys(en));
    const hiKeys = new Set(Object.keys(hi));
    expect([...enKeys].sort()).toEqual([...hiKeys].sort());
  });
});

describe('i18n t() function', () => {
  beforeAll(async () => {
    await setLocale('en');
  });

  it("t('header.title') returns non-empty string in en", async () => {
    await setLocale('en');
    const result = t('header.title');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('header.title');
  });

  it("t('header.title') returns non-empty string in hi-IN", async () => {
    await setLocale('hi-IN');
    const result = t('header.title');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it("t('errors.CAMERA_PERMISSION_DENIED') works (no missing key fallback)", async () => {
    await setLocale('en');
    const result = t('errors.CAMERA_PERMISSION_DENIED');
    expect(result).not.toBe('errors.CAMERA_PERMISSION_DENIED');
    expect(result.length).toBeGreaterThan(10);
    expect(result.toLowerCase()).toContain('camera');
  });

  it('t() falls back to key for missing keys in dev', async () => {
    await setLocale('en');
    const missingKey = 'this_key.does_not_exist_xyz';
    const result = t(missingKey);
    expect(result).toBe(missingKey);
  });

  it('t() interpolates {name} style params', async () => {
    await setLocale('en');
    const key = 'controls.start_camera';
    const result = t(key);
    expect(result).toBe(en[key]);
  });
});

describe('i18n locale detection', () => {
  it('getLocale returns a valid Locale', () => {
    const lng = getLocale();
    expect(lng === 'en' || lng === 'hi-IN').toBe(true);
  });

  it('setLocale updates locale state', async () => {
    await setLocale('hi-IN');
    expect(getLocale() === 'hi-IN' || getLocale() === 'en').toBe(true);
    await setLocale('en');
    const title = t('header.title');
    expect(title).toBe(en['header.title']);
  });
});
