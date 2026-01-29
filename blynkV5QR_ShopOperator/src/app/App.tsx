import React, { useEffect, useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './context/LanguageContext';
import { MainApp } from './MainApp';
import { LoginScreen } from './components/auth/LoginScreen';
import { DeviceRegisterScreen } from './components/auth/DeviceRegisterScreen';
import { getSubdomain, isReservedSubdomain } from '../../../src/utils/subdomain';
import { useUnifiedAuth } from '../../../src/context/UnifiedAuthContext';

export function ShopAppContent() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const { shopRestaurantId, setShopRestaurantId, isShopAuthenticated } = useUnifiedAuth();
  
  useEffect(() => {
    const { hostname, port, protocol, pathname: currentPath, search, hash } = window.location;
    if (protocol === 'http:' && port === '3000' && hostname.endsWith('.localhost')) {
      const targetUrl = `${protocol}//${hostname}${currentPath}${search}${hash}`;
      window.location.replace(targetUrl);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('shop-theme');
    return () => {
      document.body.classList.remove('shop-theme');
    };
  }, []);

  // Listen to popstate events for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // 서브도메인에서 restaurantId 가져오기
  const subdomain = getSubdomain();
  
  // 하위 호환성: 기존 URL 형식도 지원 (/shop/restaurant/:restaurantId)
  const legacyPathMatch = pathname.match(/\/shop\/restaurant\/([^/]+)(?:\/(.*))?$/);
  const legacyRestaurantId = legacyPathMatch ? legacyPathMatch[1] : null;
  const subPath = legacyPathMatch ? legacyPathMatch[2] : null;
  
  // 서브도메인이 있고 예약되지 않은 경우, 서브도메인 기반으로 동작
  // 그렇지 않으면 기존 URL 형식 사용 (하위 호환성)
  const useSubdomain = subdomain && !isReservedSubdomain(subdomain);
  
  // 서브도메인 기반인 경우 백엔드에서 restaurantId 가져오기
  useEffect(() => {
    if (useSubdomain && !shopRestaurantId) {
      fetch('/api/public/restaurant')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            setShopRestaurantId(data.data.id);
          }
        })
        .catch(err => {
          console.error('Failed to fetch restaurant from subdomain:', err);
        });
    }
  }, [useSubdomain, shopRestaurantId, setShopRestaurantId]);
  
  const restaurantId = useSubdomain ? shopRestaurantId : legacyRestaurantId;
  
  // 서브도메인 기반인 경우 경로 정리
  useEffect(() => {
    if (useSubdomain) {
      // 서브도메인 기반: /shop/login 또는 /shop/dashboard 등으로 정리
      if (pathname.startsWith('/shop/restaurant/')) {
        const newPath = pathname.replace(/^\/shop\/restaurant\/[^/]+/, '/shop');
        window.history.replaceState({}, '', newPath);
        setPathname(newPath);
      }
    } else if (legacyRestaurantId && legacyRestaurantId !== 'unknown') {
      // 기존 URL 형식 유지
    } else {
      // 서브도메인도 없고 기존 URL도 없는 경우
      if (!pathname.startsWith('/shop/restaurant/unknown/login')) {
        window.history.replaceState({}, '', '/shop/login');
        setPathname('/shop/login');
      }
    }
  }, [useSubdomain, pathname, legacyRestaurantId]);
  
  // Determine which component to render based on path and authentication
  // isShopAuthenticated를 확인하여 로그인 상태 체크
  const isLogin = !restaurantId || subPath === 'login' || pathname === '/shop/login' || (pathname === '/shop' && !isShopAuthenticated);
  
  const renderContent = () => {
    if (pathname.startsWith('/shop/device/register')) {
      return <DeviceRegisterScreen />;
    }

    if (!restaurantId || restaurantId === 'unknown') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">식당을 찾을 수 없습니다</h1>
            <p className="text-zinc-500">
              {useSubdomain 
                ? `서브도메인 "${subdomain}"에 해당하는 식당이 없습니다.`
                : '올바른 URL로 접근해주세요.'}
            </p>
          </div>
        </div>
      );
    }
    
    return isLogin ? <LoginScreen /> : <MainApp />;
  };

  return (
    <LanguageProvider>
      <div className="shop-theme">
        {renderContent()}
        <Toaster position="top-center" />
      </div>
    </LanguageProvider>
  );
}

// Keep ShopApp for backward compatibility if needed elsewhere
export function ShopApp() {
  return <ShopAppContent />;
}

export default ShopAppContent;
