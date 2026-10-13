import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer className="border-t border-white/10 bg-gray-950 text-gray-400 py-10 px-4 sm:px-6 mb-16 md:mb-0">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold text-base">
            <span>🪞</span>
            <span>AI Fashion Mirror</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            "Try Clothes. See Yourself. Shop Smarter."
          </p>
          <p className="text-[11px] text-gray-400 mt-2 max-w-md">
            🔒 Privacy First: Computer vision pose estimation and canvas mesh warping execute locally on your device.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-gray-400">
          <button type="button" onClick={() => navigate('welcome')} className="hover:text-white transition">
            Welcome
          </button>
          <button type="button" onClick={() => navigate('home')} className="hover:text-white transition">
            Dashboard
          </button>
          <button type="button" onClick={() => navigate('live')} className="hover:text-white transition">
            Live Camera
          </button>
          <button type="button" onClick={() => navigate('photo-upload')} className="hover:text-white transition">
            Photo Try-On
          </button>
          <button type="button" onClick={() => navigate('product-url')} className="hover:text-white transition">
            Import URL
          </button>
          <button type="button" onClick={() => navigate('gallery')} className="hover:text-white transition">
            Garments
          </button>
          <button type="button" onClick={() => navigate('settings')} className="hover:text-white transition">
            Settings & Privacy
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl text-center text-[11px] text-gray-400 mt-6 pt-6 border-t border-white/5">
        © 2026 AI Fashion Mirror. Production-Quality AI Virtual Try-On Platform.
      </div>
    </footer>
  );
};
