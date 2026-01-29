import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { Input } from '../ui/input';
import { getSubdomain, isReservedSubdomain } from '../../../../../src/utils/subdomain';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';

const getOrCreateDeviceId = (): string => {
  const existing = localStorage.getItem('device_id');
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `device_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  localStorage.setItem('device_id', generated);
  return generated;
};

export function DeviceRegisterScreen() {
  const { setShopRestaurantId } = useUnifiedAuth();
  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get('code') || '';
  const restaurantIdParam = params.get('restaurantId');
  const [code, setCode] = useState(initialCode);
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const deviceId = useMemo(getOrCreateDeviceId, []);
  const subdomain = getSubdomain();
  const useSubdomain = subdomain && !isReservedSubdomain(subdomain);

  useEffect(() => {
    if (restaurantIdParam) {
      setShopRestaurantId(restaurantIdParam);
    }
  }, [restaurantIdParam, setShopRestaurantId]);

  const handleRegister = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error('등록 코드를 입력하세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.redeemDeviceRegistrationCode(
        trimmedCode,
        deviceId,
        label.trim() || undefined
      );

      if (result.success && result.data) {
        localStorage.setItem('device_token', result.data.deviceToken);
        localStorage.setItem('unified_accessToken', result.data.accessToken);
        localStorage.setItem('unified_refreshToken', result.data.refreshToken);
        localStorage.setItem('unified_appType', 'shop');
        if (result.data.restaurantId) {
          localStorage.setItem('unified_shopRestaurantId', result.data.restaurantId);
        }

        toast.success('디바이스 등록이 완료되었습니다.');
        const targetPath = useSubdomain
          ? '/shop/dashboard'
          : `/shop/restaurant/${restaurantIdParam || result.data.restaurantId}/dashboard`;
        window.location.assign(targetPath);
      } else {
        throw new Error(result.error?.message || 'Failed to register device');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '디바이스 등록에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="bg-white rounded-3xl border border-zinc-100 p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto mb-6">
          <QrCode size={32} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">디바이스 등록</h1>
        <p className="text-sm text-zinc-500 mb-6">
          QR 코드로 받은 등록 코드를 입력하세요.
        </p>

        <div className="space-y-3">
          <Input
            placeholder="등록 코드"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center tracking-widest font-mono"
          />
          <Input
            placeholder="디바이스 이름 (선택)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full bg-zinc-900 text-white rounded-xl py-3 font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록하기'}
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full text-sm text-zinc-400 hover:text-zinc-600"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
