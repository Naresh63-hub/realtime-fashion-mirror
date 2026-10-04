/** Small logger that stays quiet in production builds. */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) console.debug('[tryon]', ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn('[tryon]', ...args);
  },
  error: (...args: unknown[]): void => {
    console.error('[tryon]', ...args);
  },
};
