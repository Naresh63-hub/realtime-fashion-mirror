import React from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Link2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SplashWelcomePage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-16 overflow-hidden bg-[#07080d]">
      {/* Decorative atmospheric background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-mono font-semibold text-slate-300 backdrop-blur-xl mb-8 shadow-xl">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>AURA STUDIO · PRODUCTION NEURAL COUTURE v2.0</span>
        </div>

        {/* Logo / Monogram */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-950/80 scale-100 hover:scale-105 transition-transform duration-300 ring-2 ring-white/10">
          <Sparkles className="h-12 w-12 text-white" />
        </div>

        {/* Title & Tagline */}
        <h1 className="font-display font-black text-4xl sm:text-6xl tracking-tight text-white mb-4">
          Couture Meets <span className="aura-gradient-text">Neural Intelligence</span>
        </h1>
        <p className="font-display text-lg sm:text-2xl font-bold text-slate-200 mb-3">
          "Try Clothes. See Yourself. Shop Smarter."
        </p>
        <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-400 mb-10 leading-relaxed">
          Real-time on-device skeletal tracking, high-precision cloth drape synthesis, and IDM-VTON generative AI diffusion. Experience zero-latency camera tracking with absolute device privacy.
        </p>

        {/* Main CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-8 py-4 text-xs sm:text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 transition active:scale-[0.98]"
          >
            <span>Enter Studio Atelier</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('live')}
            className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-7 py-4 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-xl hover:bg-white/[0.08] transition"
          >
            <Camera className="h-4 w-4 text-fuchsia-400" />
            <span>Open Live AR Mirror</span>
          </button>
        </div>

        {/* Three Core Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <button
            type="button"
            onClick={() => navigate('live')}
            className="aura-card p-6 text-left group shadow-xl transition-all duration-300 hover:border-indigo-500/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-4 group-hover:scale-110 transition">
              <Camera className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-bold text-white mb-1.5 group-hover:text-indigo-300 transition">
              Live AR Fitting Mirror
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              33-point MediaPipe body tracking with real-time torso alignment, sleeve contouring, and 0ms on-device latency.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('photo-upload')}
            className="aura-card p-6 text-left group shadow-xl transition-all duration-300 hover:border-fuchsia-500/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 mb-4 group-hover:scale-110 transition">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-bold text-white mb-1.5 group-hover:text-fuchsia-300 transition">
              Personal Photo Fit Studio
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your photograph to simulate tailored drape with instant geometric anchor warp or IDM-VTON generative diffusion.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('product-url')}
            className="aura-card p-6 text-left group shadow-xl transition-all duration-300 hover:border-emerald-500/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 mb-4 group-hover:scale-110 transition">
              <Link2 className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-bold text-white mb-1.5 group-hover:text-emerald-300 transition">
              Store Link Extractor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste product links from Myntra, Zara, AJIO, Amazon, or Shopify. SSRF-protected metadata and imagery parser.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
