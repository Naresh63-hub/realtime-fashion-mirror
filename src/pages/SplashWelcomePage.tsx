import React from 'react';
import { useApp } from '../context/AppContext';

export const SplashWelcomePage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12 overflow-hidden bg-radial from-violet-950/40 via-gray-950 to-gray-950">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          Production-Ready AI Computer Vision & Generative Try-On
        </div>

        {/* Logo / Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 shadow-2xl shadow-violet-800/50">
          <span className="text-4xl drop-shadow">🪞</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
          AI Fashion <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400">Mirror</span>
        </h1>
        <p className="text-lg sm:text-2xl font-medium text-gray-300 mb-2">
          "Try Clothes. See Yourself. Shop Smarter."
        </p>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-400 mb-10 leading-relaxed">
          Real-time on-device body tracking, high-precision garment mesh warping, and virtual try-on from any shopping URL or uploaded photo. Zero server delays for camera tracking.
        </p>

        {/* Main CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition active:scale-[0.98]"
          >
            <span>Get Started</span>
            <span>➔</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('live')}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-gray-200 backdrop-blur hover:bg-white/10 transition"
          >
            <span>📹 Open Live Camera</span>
          </button>
        </div>

        {/* Three Core Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <button
            type="button"
            onClick={() => navigate('live')}
            className="group rounded-2xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur hover:border-violet-500/50 hover:bg-gray-900/90 transition text-left"
          >
            <div className="text-2xl mb-3">📹</div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition">
              Live Camera Try-On
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              33-point MediaPipe body tracking with real-time torso alignment, arm sleeve tracking, and occlusion punching.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="group rounded-2xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur hover:border-violet-500/50 hover:bg-gray-900/90 transition text-left"
          >
            <div className="text-2xl mb-3">✨</div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition">
              Personal Photo Try-On
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Upload your photograph to test fit and drape with high-resolution geometric anchor warp or generative AI adapter.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="group rounded-2xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur hover:border-violet-500/50 hover:bg-gray-900/90 transition text-left"
          >
            <div className="text-2xl mb-3">🔗</div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition">
              Shopping URL Import
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Paste product URLs from Amazon, Myntra, Ajio, Zara, Uniqlo, or Shopify. SSRF-safe automated metadata extraction.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
