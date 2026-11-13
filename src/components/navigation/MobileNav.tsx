import React from 'react';
import { Home, Camera, Sparkles, ShoppingBag, Heart } from 'lucide-react';
import { useApp, type AppRoute } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { route, navigate, savedLooks } = useApp();

  const items: Array<{ id: AppRoute; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'home', label: 'Studio', icon: <Home className="h-4 w-4" /> },
    { id: 'live', label: 'Live AR', icon: <Camera className="h-4 w-4" /> },
    { id: 'photo-upload', label: 'Photo Fit', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'gallery', label: 'Wardrobe', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'saved', label: 'Saved', icon: <Heart className="h-4 w-4" />, badge: savedLooks.length },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 z-50 lg:hidden px-4 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-sm rounded-full border border-white/[0.12] bg-[#07080d]/85 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <div className="flex items-center justify-around">
          {items.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`relative flex flex-col items-center gap-1 px-3.5 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)] scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && !isActive && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
