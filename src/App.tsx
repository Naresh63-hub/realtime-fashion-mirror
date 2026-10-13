import React from 'react';
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
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100 selection:bg-violet-600 selection:text-white">
      <Navbar />
      <main className="flex-1">
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
