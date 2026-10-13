import React from 'react';
import { useApp, type AppRoute } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const { route, navigate } = useApp();

  const items: Array<{ id: AppRoute; label: string; icon: string }> = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'live', label: 'Live Try-On', icon: '📹' },
    { id: 'photo-upload', label: 'Photo', icon: '✨' },
    { id: 'gallery', label: 'Garments', icon: '👗' },
    { id: 'saved', label: 'Saved', icon: '❤️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-gray-950/90 backdrop-blur-lg px-2 py-1.5">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition ${
                isActive ? 'text-violet-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
