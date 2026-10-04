import { describe, it, expect } from 'vitest';
import { NoopARProvider } from './NoopARProvider';
import { ErrorType } from '../types';
import { AppErrorLike } from '../utils/errors';

describe('NoopARProvider (TR-13.1)', () => {
  it('isSupported() returns false', () => {
    const provider = new NoopARProvider();
    expect(provider.isSupported()).toBe(false);
  });

  it('start() throws AR_NOT_SUPPORTED error with details referencing ARCHITECTURE.md', async () => {
    const provider = new NoopARProvider();
    const fakeVideo = document.createElement('video');

    await expect(() => provider.start(fakeVideo)).rejects.toThrow(AppErrorLike);

    try {
      await provider.start(fakeVideo);
      throw new Error('Expected start() to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppErrorLike);
      const appErr = err as AppErrorLike;
      expect(appErr.type).toBe(ErrorType.AR_NOT_SUPPORTED);
      expect(appErr.details).toBeDefined();
      expect(appErr.details).toContain('ARCHITECTURE.md');
    }
  });

  it('stop() is a noop and does not throw', () => {
    const provider = new NoopARProvider();
    expect(() => provider.stop()).not.toThrow();
  });
});
