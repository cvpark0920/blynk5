import React, { useEffect, useState } from 'react';
import { BlynkApp } from './components/BlynkApp';
import { SessionProvider } from './context/SessionContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Toaster } from './components/ui/sonner';
import { getSubdomain } from '../../../src/utils/subdomain';

export default function CustomerApp() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  // 서브도메인에서 restaurantId 가져오기
  const subdomain = getSubdomain();
  
  // Listen to popstate events for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // 서브도메인 기반: /customer/table/:tableNumber
  const subdomainPathMatch = pathname.match(/\/customer\/table\/([^/]+)/);
  const tableNumberStr = subdomainPathMatch ? subdomainPathMatch[1] : null;
  
  // 하위 호환성: 기존 URL 형식 /customer/r/:restaurantId/t/:tableNumber
  const legacyPathMatch = pathname.match(/\/customer\/r\/([^/]+)\/t\/([^/]+)/);
  const legacyRestaurantId = legacyPathMatch ? legacyPathMatch[1] : null;
  const legacyTableNumberStr = legacyPathMatch ? legacyPathMatch[2] : null;
  
  // 테이블 번호 결정 (서브도메인 기반 또는 기존 형식)
  const effectiveTableNumberStr = tableNumberStr || legacyTableNumberStr;
  
  // 서브도메인 기반인 경우 백엔드에서 restaurantId 가져오기
  useEffect(() => {
    if (subdomain && effectiveTableNumberStr) {
      // 서브도메인으로 식당 정보 조회
      fetch('/api/public/restaurant')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setRestaurantId(data.data.id);
          } else {
            console.error('Failed to fetch restaurant:', data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch restaurant:', err);
        });
    } else if (legacyRestaurantId) {
      setRestaurantId(legacyRestaurantId);
    }
  }, [subdomain, effectiveTableNumberStr, legacyRestaurantId]);
  
  // 기존 URL 형식으로 접근한 경우 서브도메인 형식으로 리다이렉트
  useEffect(() => {
    if (legacyRestaurantId && legacyTableNumberStr && subdomain) {
      const newPath = `/customer/table/${legacyTableNumberStr}`;
      window.history.replaceState({}, '', newPath);
      setPathname(newPath);
    }
  }, [legacyRestaurantId, legacyTableNumberStr, subdomain]);
  
  // Render content based on URL
  const renderContent = () => {
    // 서브도메인 기반 또는 기존 형식으로 restaurantId와 tableNumber가 있는 경우
    if (restaurantId && effectiveTableNumberStr) {
      const tableNumberInt = parseInt(effectiveTableNumberStr, 10);
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
    
    // restaurantId 로딩 중
    if (subdomain && !restaurantId) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
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
      <div className="customer-theme min-h-screen bg-background text-foreground">
        {renderContent()}
        <Toaster position="top-center" />
      </div>
    </LanguageProvider>
  );
}