import React from 'react';
import { Sparkles, Shield, Cpu, Zap, Camera, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer className="border-t border-white/[0.08] bg-[#07080d] text-slate-400 py-12 px-4 sm:px-6 mb-20 lg:mb-0 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-48 bg-gradient-to-t from-indigo-950/20 via-purple-950/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-10 border-b border-white/[0.06] pb-10">
          <div className="max-w-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display font-black text-white text-lg tracking-tight">AURA STUDIO</span>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
                PROD v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Next-generation AI virtual fitting room engine. Real-time on-device landmark tracking,
              cloth drape synthesis, and IDM-VTON photoreal generative diffusion.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 border border-white/[0.08]">
                <Shield className="h-3 w-3 text-emerald-400" />
                <span>Private & On-Device</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 border border-white/[0.08]">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>0ms Local Latency</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 border border-white/[0.08]">
                <Cpu className="h-3 w-3 text-indigo-400" />
                <span>MediaPipe & WebGL2</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-slate-200">Fitting Studio</h4>
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => navigate('live')} className="hover:text-white transition">
                    Live AR Camera
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('photo-upload')} className="hover:text-white transition">
                    Photo Try-On Suite
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('product-url')} className="hover:text-white transition">
                    Store Link Importer
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-slate-200">Wardrobe</h4>
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => navigate('gallery')} className="hover:text-white transition">
                    Designer Collection
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('saved')} className="hover:text-white transition">
                    Saved Looks
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('compare')} className="hover:text-white transition">
                    Style Comparison
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-slate-200">System</h4>
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => navigate('welcome')} className="hover:text-white transition">
                    Overview
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('settings')} className="hover:text-white transition">
                    Vision Settings
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('profile')} className="hover:text-white transition">
                    Profile & Sizing
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] text-slate-400">
          <p>© 2026 AURA Virtual Fashion. Production-grade AI Try-On Platform.</p>
          <p className="flex items-center gap-2">
            <span>Built for Modern Web</span>
            <span>•</span>
            <span>React 19 & Vite</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
