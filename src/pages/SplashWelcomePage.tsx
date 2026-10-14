import React from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Link2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SplashWelcomePage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12 overflow-hidden bg-radial from-violet-950/40 via-gray-950 to-gray-950">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-xl mb-8 shadow-lg shadow-violet-900/30">
          <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          Production-Ready AI Computer Vision & Generative Try-On
        </div>

        {/* Logo / Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 shadow-2xl shadow-violet-800/60 scale-100 hover:scale-105 transition-transform duration-300">
          <Sparkles className="h-10 w-10 text-white" />
        </div>

        {/* Title & Tagline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4">
          AI Fashion <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400">Mirror</span>
        </h1>
        <p className="text-lg sm:text-2xl font-bold text-gray-300 mb-3">
          "Try Clothes. See Yourself. Shop Smarter."
        </p>
        <p className="max-w-2xl mx-auto text-xs sm:text-base text-gray-400 mb-10 leading-relaxed">
          Real-time on-device body tracking, high-precision garment mesh warping, and virtual try-on from any shopping URL or uploaded photo. Zero server delays for camera tracking.
        </p>

        {/* Main CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-violet-700/40 hover:bg-violet-500 transition active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('live')}
            className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-xs sm:text-sm font-semibold text-gray-200 backdrop-blur-xl hover:bg-white/10 transition"
          >
            <Camera className="h-4 w-4 text-violet-400" />
            <span>Open Live Camera</span>
          </button>
        </div>

        {/* Three Core Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <button
            type="button"
            onClick={() => navigate('live')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-6 backdrop-blur-xl hover:border-violet-500/50 hover:bg-gray-900/90 transition shadow-2xl text-left duration-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 mb-4 group-hover:scale-110 transition">
              <Camera className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-violet-300 transition">
              Live Camera Try-On
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              33-point MediaPipe body tracking with real-time torso alignment, arm sleeve tracking, and occlusion punching.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-6 backdrop-blur-xl hover:border-violet-500/50 hover:bg-gray-900/90 transition shadow-2xl text-left duration-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 mb-4 group-hover:scale-110 transition">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-violet-300 transition">
              Personal Photo Try-On
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Upload your photograph to test fit and drape with high-resolution geometric anchor warp or generative AI adapter.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="group rounded-3xl border border-white/10 bg-gray-900/60 p-6 backdrop-blur-xl hover:border-violet-500/50 hover:bg-gray-900/90 transition shadow-2xl text-left duration-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 mb-4 group-hover:scale-110 transition">
              <Link2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-violet-300 transition">
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
