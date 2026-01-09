import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './context/LanguageContext';
import { useUnifiedAuth } from '../../../src/context/UnifiedAuthContext';
import { MainApp } from './MainApp';
import { LoginScreen } from './components/auth/LoginScreen';

// Wrapper component to extract restaurantId from URL
function RestaurantRoutes() {
  const { restaurantId } = useParams<{ restaurantId: string }>();

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

  return (
    <Routes>
      <Route path="login" element={<LoginScreen />} />
      <Route path="dashboard" element={<MainApp />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export function ShopApp() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/shop/restaurant/unknown/login" replace />} />
        <Route path="restaurant/:restaurantId/*" element={<RestaurantRoutes />} />
        <Route path="*" element={<Navigate to="/shop/restaurant/unknown/login" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </LanguageProvider>
  );
}
