import React from 'react';
import { Home, Camera, Sparkles, ShoppingBag, Heart } from 'lucide-react';
import { useApp, type AppRoute } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { route, navigate, savedLooks } = useApp();

  const items: Array<{ id: AppRoute; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'live', label: 'Live', icon: <Camera className="h-5 w-5" /> },
    { id: 'photo-upload', label: 'Photo', icon: <Sparkles className="h-5 w-5" /> },
    { id: 'gallery', label: 'Garments', icon: <ShoppingBag className="h-5 w-5" /> },
    { id: 'saved', label: 'Saved', icon: <Heart className="h-5 w-5" />, badge: savedLooks.length },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-gray-950/80 backdrop-blur-2xl shadow-2xl px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition duration-200 ${
                isActive
                  ? 'text-violet-400 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-200 font-medium'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-violet-500 shadow-sm shadow-violet-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
