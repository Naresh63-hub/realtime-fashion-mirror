/**
 * ARProvider — native ARKit/ARCore bridge interface.
 *
 * A real implementation requires:
 *   1) Swift iOS WKWebView with ARView session,
 *   2) Kotlin Android WebView with Sceneform/ARCore,
 *   3) JS↔native postMessage bridge defined in the docs below.
 */

import type { ARProvider as IARProvider } from '../types';
export type ARProvider = IARProvider;
