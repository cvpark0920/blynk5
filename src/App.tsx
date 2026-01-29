import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UnifiedAuthProvider } from './context/UnifiedAuthContext';
import { AdminApp } from '../blynkV5QR_Administrator/src/app/App';
import { ShopAppContent } from '../blynkV5QR_ShopOperator/src/app/App';
import CustomerApp from '../blynkV5QR_Customer/src/app/App';
import { getSubdomain, isReservedSubdomain } from './utils/subdomain';
import { useEffect } from 'react';

export default function UnifiedApp() {
  console.log('🔵 [UnifiedApp] Component rendering');
  
  // 서브도메인 기반 라우팅 결정
  const subdomain = getSubdomain();
  const isAdminSubdomain = subdomain === 'admin';
  const isShopSubdomain = subdomain && !isReservedSubdomain(subdomain) && subdomain !== 'admin';
  
  // 루트 경로 리다이렉트 결정
  const RootRedirect = () => {
    if (isAdminSubdomain) {
      return <Navigate to="/admin" replace />;
    } else if (isShopSubdomain) {
      return <Navigate to="/shop" replace />;
    }
    // 서브도메인이 없으면 관리자 앱으로
    return <Navigate to="/admin" replace />;
  };
  
  // 서브도메인 기반 라우트 가드 컴포넌트
  const AdminRouteGuard = ({ children }: { children: React.ReactElement }) => {
    const location = useLocation();
    
    useEffect(() => {
      // shop 서브도메인에서 /admin 접근 시 리다이렉트
      if (isShopSubdomain && location.pathname.startsWith('/admin')) {
        window.location.href = `http://${window.location.host}/shop`;
      }
    }, [location.pathname, isShopSubdomain]);
    
    // admin 서브도메인이거나 서브도메인이 없으면 접근 허용
    if (isAdminSubdomain || !subdomain) {
      return children;
    }
    // shop 서브도메인에서 /admin 접근 시 차단
    if (isShopSubdomain) {
      return <Navigate to="/shop" replace />;
    }
    return children;
  };
  
  const ShopRouteGuard = ({ children }: { children: React.ReactElement }) => {
    const location = useLocation();
    
    useEffect(() => {
      // admin 서브도메인에서 /shop 접근 시 리다이렉트
      if (isAdminSubdomain && location.pathname.startsWith('/shop')) {
        window.location.href = `http://${window.location.host}/admin`;
      }
    }, [location.pathname, isAdminSubdomain]);
    
    // shop 서브도메인이거나 서브도메인이 없으면 접근 허용
    if (isShopSubdomain || !subdomain) {
      return children;
    }
    // admin 서브도메인에서 /shop 접근 시 차단
    if (isAdminSubdomain) {
      return <Navigate to="/admin" replace />;
    }
    return children;
  };
  
  return (
    <BrowserRouter>
      <UnifiedAuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminRouteGuard><AdminApp /></AdminRouteGuard>} />
          <Route path="/shop/*" element={<ShopRouteGuard><ShopAppContent /></ShopRouteGuard>} />
          <Route path="/customer/*" element={<CustomerApp />} />
          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </UnifiedAuthProvider>
    </BrowserRouter>
  );
}
