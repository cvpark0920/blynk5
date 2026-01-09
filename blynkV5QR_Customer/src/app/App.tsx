import React from 'react';
import { Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom';
import { BlynkApp } from './components/BlynkApp';
import { SessionProvider } from './context/SessionContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Toaster } from './components/ui/sonner';

// 쿼리 파라미터 처리 컴포넌트
function CustomerQueryHandler() {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get('restaurant');
  const tableNumber = searchParams.get('table');

  if (restaurantId && tableNumber) {
    return <Navigate to={`/customer/r/${restaurantId}/t/${tableNumber}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 링크입니다</h1>
        <p className="text-gray-500">올바른 QR 코드로 접근해주세요.</p>
      </div>
    </div>
  );
}

// BlynkApp을 SessionProvider로 감싸는 래퍼
function BlynkAppWrapper() {
  const { restaurantId, tableNumber } = useParams<{
    restaurantId: string;
    tableNumber: string;
  }>();

  if (!restaurantId || !tableNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 링크입니다</h1>
          <p className="text-gray-500">올바른 QR 코드로 접근해주세요.</p>
        </div>
      </div>
    );
  }

  const tableNumberInt = parseInt(tableNumber, 10);
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

export default function CustomerApp() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/customer" element={<CustomerQueryHandler />} />
        <Route path="r/:restaurantId/t/:tableNumber" element={<BlynkAppWrapper />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </LanguageProvider>
  );
}