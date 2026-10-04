import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from './index';

describe('APP_CONFIG new scalars — typeof + range checks', () => {
  describe('RENDERING section additions', () => {
    it('ENABLE_WRINKLES is a boolean', () => {
      expect(typeof APP_CONFIG.RENDERING.ENABLE_WRINKLES).toBe('boolean');
    });

    it('WRINKLE_INTENSITY is a number in [0, 1]', () => {
      expect(typeof APP_CONFIG.RENDERING.WRINKLE_INTENSITY).toBe('number');
      expect(APP_CONFIG.RENDERING.WRINKLE_INTENSITY).toBeGreaterThanOrEqual(0);
      expect(APP_CONFIG.RENDERING.WRINKLE_INTENSITY).toBeLessThanOrEqual(1);
    });

    it('WEBGPU_PREFERRED is a boolean', () => {
      expect(typeof APP_CONFIG.RENDERING.WEBGPU_PREFERRED).toBe('boolean');
    });
  });

  describe('PERFORMANCE section additions', () => {
    it('USE_WORKER is a boolean', () => {
      expect(typeof APP_CONFIG.PERFORMANCE.USE_WORKER).toBe('boolean');
    });
  });

  describe('FIT section', () => {
    it('FIT.DEFAULTS.bust is a number in [0, 1]', () => {
      expect(typeof APP_CONFIG.FIT.DEFAULTS.bust).toBe('number');
      expect(APP_CONFIG.FIT.DEFAULTS.bust).toBeGreaterThanOrEqual(0);
      expect(APP_CONFIG.FIT.DEFAULTS.bust).toBeLessThanOrEqual(1);
    });

    it('FIT.DEFAULTS.waist is a number in [0, 1]', () => {
      expect(typeof APP_CONFIG.FIT.DEFAULTS.waist).toBe('number');
      expect(APP_CONFIG.FIT.DEFAULTS.waist).toBeGreaterThanOrEqual(0);
      expect(APP_CONFIG.FIT.DEFAULTS.waist).toBeLessThanOrEqual(1);
    });

    it('FIT.DEFAULTS.hip is a number in [0, 1]', () => {
      expect(typeof APP_CONFIG.FIT.DEFAULTS.hip).toBe('number');
      expect(APP_CONFIG.FIT.DEFAULTS.hip).toBeGreaterThanOrEqual(0);
      expect(APP_CONFIG.FIT.DEFAULTS.hip).toBeLessThanOrEqual(1);
    });

    it('FIT.DEFAULTS.height is a number in [0, 1]', () => {
      expect(typeof APP_CONFIG.FIT.DEFAULTS.height).toBe('number');
      expect(APP_CONFIG.FIT.DEFAULTS.height).toBeGreaterThanOrEqual(0);
      expect(APP_CONFIG.FIT.DEFAULTS.height).toBeLessThanOrEqual(1);
    });
  });

  describe('AUTH section', () => {
    it('AUTH.SESSION_DAYS is a number in [1, 365]', () => {
      expect(typeof APP_CONFIG.AUTH.SESSION_DAYS).toBe('number');
      expect(APP_CONFIG.AUTH.SESSION_DAYS).toBeGreaterThanOrEqual(1);
      expect(APP_CONFIG.AUTH.SESSION_DAYS).toBeLessThanOrEqual(365);
    });
  });

  describe('COMMERCE section', () => {
    it('COMMERCE.CURRENCY is a non-empty string', () => {
      expect(typeof APP_CONFIG.COMMERCE.CURRENCY).toBe('string');
      expect(APP_CONFIG.COMMERCE.CURRENCY.length).toBeGreaterThan(0);
    });
  });

  describe('SHARE section', () => {
    it('SHARE.MAX_RECORD_SECONDS is a positive number in [1, 600]', () => {
      expect(typeof APP_CONFIG.SHARE.MAX_RECORD_SECONDS).toBe('number');
      expect(APP_CONFIG.SHARE.MAX_RECORD_SECONDS).toBeGreaterThan(0);
      expect(APP_CONFIG.SHARE.MAX_RECORD_SECONDS).toBeGreaterThanOrEqual(1);
      expect(APP_CONFIG.SHARE.MAX_RECORD_SECONDS).toBeLessThanOrEqual(600);
    });
  });

  describe('PHYSICS section', () => {
    it('PHYSICS.ENABLED is a boolean', () => {
      expect(typeof APP_CONFIG.PHYSICS.ENABLED).toBe('boolean');
    });
  });
});
