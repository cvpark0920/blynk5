import React, { useEffect, useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './context/LanguageContext';
import { MainApp } from './MainApp';
import { LoginScreen } from './components/auth/LoginScreen';

export function ShopAppContent() {
  const [pathname, setPathname] = useState(window.location.pathname);
  
  // Listen to popstate events for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Parse URL to extract restaurantId and subPath
  // Pattern: /shop/restaurant/:restaurantId/:subPath
  const pathMatch = pathname.match(/\/shop\/restaurant\/([^/]+)(?:\/(.*))?$/);
  const restaurantId = pathMatch ? pathMatch[1] : null;
  const subPath = pathMatch ? pathMatch[2] : null;
  
  // Redirect to login if no restaurantId
  useEffect(() => {
    if (!restaurantId || restaurantId === 'unknown') {
      if (pathname !== '/shop/restaurant/unknown/login') {
        window.history.replaceState({}, '', '/shop/restaurant/unknown/login');
        setPathname('/shop/restaurant/unknown/login');
      }
    }
  }, [restaurantId, pathname]);
  
  // Determine which component to render based on path
  const isLogin = subPath === 'login' || !subPath || subPath === '';
  
  const renderContent = () => {
    if (!restaurantId || restaurantId === 'unknown') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">식당 ID가 필요합니다</h1>
            <p className="text-zinc-500">올바른 URL로 접근해주세요.</p>
          </div>
        </div>
      );
    }
    
    return isLogin ? <LoginScreen /> : <MainApp />;
  };

  return (
    <LanguageProvider>
      {renderContent()}
      <Toaster position="top-center" />
    </LanguageProvider>
  );
}

// Keep ShopApp for backward compatibility if needed elsewhere
export function ShopApp() {
  return <ShopAppContent />;
}
