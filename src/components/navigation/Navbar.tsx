import React from 'react';
import {
  Home,
  Camera,
  Sparkles,
  Link2,
  ShoppingBag,
  Heart,
  Scale,
  Settings,
  User,
  Globe,
  Radio,
} from 'lucide-react';
import { useApp, type AppRoute } from '../../context/AppContext';
import { useTranslation, type Locale } from '../../i18n';

export const Navbar: React.FC = () => {
  const { route, navigate, savedLooks } = useApp();
  const { locale, setLocale } = useTranslation();

  const navLinks: Array<{ id: AppRoute; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'home', label: 'Studio', icon: <Home className="h-3.5 w-3.5" /> },
    { id: 'live', label: 'Live AR', icon: <Camera className="h-3.5 w-3.5" /> },
    { id: 'photo-upload', label: 'Photo Fit', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'product-url', label: 'Import Link', icon: <Link2 className="h-3.5 w-3.5" /> },
    { id: 'gallery', label: 'Wardrobe', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
    { id: 'saved', label: 'Saved', icon: <Heart className="h-3.5 w-3.5" />, badge: savedLooks.length },
    { id: 'compare', label: 'Compare', icon: <Scale className="h-3.5 w-3.5" /> },
  ];

  const toggleLanguage = () => {
    const next: Locale = locale === 'en' ? 'hi-IN' : 'en';
    void setLocale(next);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#07080d]/80 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-95 outline-none group"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-500 shadow-[0_0_24px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform duration-300 border border-white/20">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black tracking-tight text-white text-base sm:text-lg">
                AURA
              </span>
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-indigo-300 border border-indigo-500/25">
                AI 2.0
              </span>
            </div>
            <p className="text-[10px] tracking-wide text-slate-400 uppercase font-medium hidden sm:block">
              Virtual Fashion Studio
            </p>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
          {navLinks.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 text-white border border-indigo-500/40 shadow-[0_2px_12px_rgba(99,102,241,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 rounded-full bg-indigo-500/30 px-1.5 py-0.2 text-[9px] font-bold text-indigo-200 border border-indigo-500/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons: Engine Status, Language, Settings, Profile */}
        <div className="flex items-center gap-2">
          {/* Live Studio Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-[11px] font-mono text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
            <span>STUDIO READY</span>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            title="Toggle Language"
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.1] hover:text-white border border-white/[0.08] transition backdrop-blur-md"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-mono text-[11px]">{locale === 'en' ? 'HI' : 'EN'}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => navigate('settings')}
            title="Studio Settings & Vision Tunables"
            aria-label="Settings and Privacy"
            className={`rounded-xl p-2 text-sm transition-all border backdrop-blur-md ${
              route === 'settings'
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'text-slate-300 bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate('profile')}
            title="User Profile"
            aria-label="User Profile"
            className={`flex items-center gap-1.5 rounded-xl p-1 transition-all border backdrop-blur-md ${
              route === 'profile'
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'text-slate-300 bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1]'
            }`}
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-xs text-white font-bold shadow-sm">
              <User className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
