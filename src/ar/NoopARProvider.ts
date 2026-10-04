import type { ARProvider } from './ARProvider';
import { appError } from '../utils/errors';
import { ErrorType } from '../types';

export class NoopARProvider implements ARProvider {
  isSupported(): boolean {
    return false;
  }

  async start(_video: HTMLVideoElement): Promise<void> {
    if (!this.isSupported()) {
      throw appError(
        ErrorType.AR_NOT_SUPPORTED,
        'Native AR requires iOS WKWebView with ARKit bridge or Android WebView with ARCore bridge. See ARCHITECTURE.md §Future-AR for spec.'
      );
    }
  }

  stop(): void {}
}
