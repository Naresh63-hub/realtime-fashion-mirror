import React from 'react';
import { useApp, type AppRoute } from '../../context/AppContext';
import { useTranslation, type Locale } from '../../i18n';

export const Navbar: React.FC = () => {
  const { route, navigate, savedLooks, favoriteIds } = useApp();
  const { t, locale, setLocale } = useTranslation();

  const navLinks: Array<{ id: AppRoute; label: string; icon: string }> = [
    { id: 'home', label: 'Dashboard', icon: '🏠' },
    { id: 'live', label: 'Live Camera', icon: '📹' },
    { id: 'photo-upload', label: 'Photo Try-On', icon: '✨' },
    { id: 'product-url', label: 'Import Link', icon: '🔗' },
    { id: 'gallery', label: 'Garments', icon: '👗' },
    { id: 'saved', label: `Saved (${savedLooks.length})`, icon: '❤️' },
    { id: 'compare', label: 'Compare', icon: '⚖️' },
  ];

  const toggleLanguage = () => {
    const next: Locale = locale === 'en' ? 'hi-IN' : 'en';
    void setLocale(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-2.5 text-left transition hover:opacity-90 outline-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 shadow-md shadow-violet-900/40">
            <span className="text-xl">🪞</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-base">AI Fashion Mirror</span>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">Try Clothes. See Yourself. Shop Smarter.</p>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
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
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 border border-white/10 transition"
          >
            {locale === 'en' ? '🌐 HI' : '🌐 EN'}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => navigate('settings')}
            title="Settings & Privacy"
            aria-label="Settings and Privacy"
            className={`rounded-lg p-2 text-sm transition border ${
              route === 'settings'
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                : 'text-gray-300 bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            ⚙️
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate('profile')}
            title="User Profile"
            aria-label="User Profile"
            className={`flex items-center gap-1.5 rounded-lg p-1.5 transition border ${
              route === 'profile'
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                : 'text-gray-300 bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs text-white font-bold">
              U
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
