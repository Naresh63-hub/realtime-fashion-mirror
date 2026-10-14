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
} from 'lucide-react';
import { useApp, type AppRoute } from '../../context/AppContext';
import { useTranslation, type Locale } from '../../i18n';

export const Navbar: React.FC = () => {
  const { route, navigate, savedLooks } = useApp();
  const { locale, setLocale } = useTranslation();

  const navLinks: Array<{ id: AppRoute; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'home', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { id: 'live', label: 'Live Camera', icon: <Camera className="h-4 w-4" /> },
    { id: 'photo-upload', label: 'Photo Try-On', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'product-url', label: 'Import Link', icon: <Link2 className="h-4 w-4" /> },
    { id: 'gallery', label: 'Garments', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'saved', label: 'Saved', icon: <Heart className="h-4 w-4" />, badge: savedLooks.length },
    { id: 'compare', label: 'Compare', icon: <Scale className="h-4 w-4" /> },
  ];

  const toggleLanguage = () => {
    const next: Locale = locale === 'en' ? 'hi-IN' : 'en';
    void setLocale(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/70 backdrop-blur-2xl shadow-lg shadow-black/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-3 text-left transition hover:opacity-90 outline-none group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 shadow-md shadow-violet-900/50 group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">AI Fashion Mirror</span>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">Try Clothes. See Yourself. Shop Smarter.</p>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navLinks.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-violet-600/25 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-600/20'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-0.5 rounded-full bg-violet-500/30 px-1.5 py-0.2 text-[10px] text-violet-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons: Language, Settings, Profile */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            title="Toggle Language"
            className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 border border-white/10 transition backdrop-blur-md"
          >
            <Globe className="h-3.5 w-3.5 text-violet-400" />
            <span>{locale === 'en' ? 'HI' : 'EN'}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => navigate('settings')}
            title="Settings & Privacy"
            aria-label="Settings and Privacy"
            className={`rounded-xl p-2 text-sm transition border backdrop-blur-md ${
              route === 'settings'
                ? 'bg-violet-600/25 text-violet-300 border-violet-500/40'
                : 'text-gray-300 bg-white/5 border-white/10 hover:bg-white/10'
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
            className={`flex items-center gap-1.5 rounded-xl p-1.5 transition border backdrop-blur-md ${
              route === 'profile'
                ? 'bg-violet-600/25 text-violet-300 border-violet-500/40'
                : 'text-gray-300 bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs text-white font-bold">
              <User className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
