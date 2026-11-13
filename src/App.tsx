import React from 'react';
import { Toaster } from 'sonner';
import { TranslationProvider } from './i18n';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/navigation/Navbar';
import { MobileNav } from './components/navigation/MobileNav';
import { Footer } from './components/navigation/Footer';

// 12 Complete Application Pages
import { SplashWelcomePage } from './pages/SplashWelcomePage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { LiveCameraPage } from './pages/LiveCameraPage';
import { PhotoUploadPage } from './pages/PhotoUploadPage';
import { ProductUrlImportPage } from './pages/ProductUrlImportPage';
import { ClothingGalleryPage } from './pages/ClothingGalleryPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { VirtualTryOnResultsPage } from './pages/VirtualTryOnResultsPage';
import { StyleComparisonPage } from './pages/StyleComparisonPage';
import { SavedLooksPage } from './pages/SavedLooksPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';

const PageRenderer: React.FC = () => {
  const { route } = useApp();

  switch (route) {
    case 'welcome':
      return <SplashWelcomePage />;
    case 'home':
      return <HomeDashboardPage />;
    case 'live':
      return <LiveCameraPage />;
    case 'photo-upload':
      return <PhotoUploadPage />;
    case 'product-url':
      return <ProductUrlImportPage />;
    case 'gallery':
      return <ClothingGalleryPage />;
    case 'product-details':
      return <ProductDetailsPage />;
    case 'results':
      return <VirtualTryOnResultsPage />;
    case 'compare':
      return <StyleComparisonPage />;
    case 'saved':
      return <SavedLooksPage />;
    case 'profile':
      return <UserProfilePage />;
    case 'settings':
      return <SettingsPrivacyPage />;
    default:
      return <HomeDashboardPage />;
  }
};

const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#07080d] text-slate-100 selection:bg-indigo-600 selection:text-white font-sans antialiased relative">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        richColors
        theme="dark"
        closeButton
        toastOptions={{
          style: {
            background: 'rgba(13, 15, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
          },
        }}
      />

      <Navbar />

      {/* Main content with mobile bottom safe area padding */}
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <PageRenderer />
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
};

export default function App() {
  return (
    <TranslationProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </TranslationProvider>
  );
}
