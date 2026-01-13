import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UnifiedAuthProvider } from './context/UnifiedAuthContext';
import { AdminApp } from '../blynkV5QR_Administrator/src/app/App';
import { ShopAppContent } from '../blynkV5QR_ShopOperator/src/app/App';
import CustomerApp from '../blynkV5QR_Customer/src/app/App';

export default function UnifiedApp() {
  console.log('🔵 [UnifiedApp] Component rendering');
  return (
    <BrowserRouter>
      {(() => {
        console.log('🔵 [UnifiedApp] BrowserRouter wrapper rendered');
        return null;
      })()}
      <UnifiedAuthProvider>
        {(() => {
          console.log('🔵 [UnifiedApp] UnifiedAuthProvider wrapper rendered');
          return null;
        })()}
        <Routes>
          {(() => {
            console.log('🔵 [UnifiedApp] Routes wrapper rendered');
            return null;
          })()}
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/shop/*" element={<ShopAppContent />} />
          <Route path="/customer/*" element={<CustomerApp />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </UnifiedAuthProvider>
    </BrowserRouter>
  );
}
