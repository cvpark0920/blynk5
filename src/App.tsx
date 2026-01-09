import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UnifiedAuthProvider } from './context/UnifiedAuthContext';
import { AdminApp } from '../blynkV5QR_Administrator/src/app/App';
import { ShopApp } from '../blynkV5QR_ShopOperator/src/app/App';
import CustomerApp from '../blynkV5QR_Customer/src/app/App';

export default function UnifiedApp() {
  return (
    <BrowserRouter>
      <UnifiedAuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/shop/*" element={<ShopApp />} />
          <Route path="/customer/*" element={<CustomerApp />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </UnifiedAuthProvider>
    </BrowserRouter>
  );
}
