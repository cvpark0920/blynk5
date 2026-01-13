import React, { useEffect, useState } from 'react';
import { BlynkApp } from './components/BlynkApp';
import { SessionProvider } from './context/SessionContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Toaster } from './components/ui/sonner';

export default function CustomerApp() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  
  // Listen to popstate events for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Parse URL to extract restaurantId and tableNumber
  // Pattern: /customer/r/:restaurantId/t/:tableNumber
  const pathMatch = pathname.match(/\/customer\/r\/([^/]+)\/t\/([^/]+)/);
  const restaurantId = pathMatch ? pathMatch[1] : null;
  const tableNumberStr = pathMatch ? pathMatch[2] : null;
  
  // Check for query parameters (legacy support)
  const searchParams = new URLSearchParams(search);
  const queryRestaurantId = searchParams.get('restaurant');
  const queryTableNumber = searchParams.get('table');
  
  // Redirect if query params exist
  useEffect(() => {
    if (queryRestaurantId && queryTableNumber && !restaurantId) {
      const newPath = `/customer/r/${queryRestaurantId}/t/${queryTableNumber}`;
      window.history.replaceState({}, '', newPath);
      setPathname(newPath);
      setSearch('');
    }
  }, [queryRestaurantId, queryTableNumber, restaurantId]);
  
  // Render content based on URL
  const renderContent = () => {
    // If we have restaurantId and tableNumber from path
    if (restaurantId && tableNumberStr) {
      const tableNumberInt = parseInt(tableNumberStr, 10);
      if (isNaN(tableNumberInt)) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 테이블 번호입니다</h1>
              <p className="text-gray-500">올바른 QR 코드로 접근해주세요.</p>
            </div>
          </div>
        );
      }
      
      return (
        <SessionProvider restaurantId={restaurantId} tableNumber={tableNumberInt}>
          <BlynkApp />
        </SessionProvider>
      );
    }
    
    // If we have query params, wait for redirect
    if (queryRestaurantId && queryTableNumber) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">리다이렉트 중...</p>
          </div>
        </div>
      );
    }
    
    // Invalid URL
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 링크입니다</h1>
          <p className="text-gray-500">올바른 QR 코드로 접근해주세요.</p>
        </div>
      </div>
    );
  };

  return (
    <LanguageProvider>
      {renderContent()}
      <Toaster position="top-center" />
    </LanguageProvider>
  );
}