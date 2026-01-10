import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CreditCard, Banknote, Building2, Save } from 'lucide-react';
import { cn } from '../ui/utils';

interface Bank {
  id: number;
  name: string;
  code: string;
  shortName: string;
  logo: string | null;
  swiftCode: string | null;
}

interface PaymentMethodsData {
  cash: { enabled: boolean };
  card: { enabled: boolean };
  bankTransfer: {
    enabled: boolean;
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
  };
}

interface PaymentMethodManagementProps {
  isEmbedded?: boolean;
}

export function PaymentMethodManagement({ isEmbedded = false }: PaymentMethodManagementProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsData>({
    cash: { enabled: false },
    card: { enabled: false },
    bankTransfer: {
      enabled: false,
      bankName: '',
      accountHolder: '',
      accountNumber: '',
    },
  });

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      loadPaymentMethods();
    }
  }, [restaurantId]);

  const loadBanks = async () => {
    try {
      const result = await apiClient.getBanks();
      if (result.success && result.data) {
        setBanks(result.data);
      }
    } catch (error: unknown) {
      console.error('Error loading banks:', error);
    }
  };

  const loadPaymentMethods = async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const result = await apiClient.getPaymentMethods();
      if (result.success && result.data) {
        setPaymentMethods({
          cash: result.data.cash || { enabled: false },
          card: result.data.card || { enabled: false },
          bankTransfer: result.data.bankTransfer || {
            enabled: false,
            bankName: '',
            accountHolder: '',
            accountNumber: '',
          },
        });
      }
    } catch (error: unknown) {
      console.error('Error loading payment methods:', error);
      toast.error('결제 방법을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error('식당 ID가 필요합니다.');
      return;
    }

    // Validate bank transfer fields if enabled
    if (paymentMethods.bankTransfer.enabled) {
      if (
        !paymentMethods.bankTransfer.bankName ||
        !paymentMethods.bankTransfer.accountHolder ||
        !paymentMethods.bankTransfer.accountNumber
      ) {
        toast.error('계좌이체가 활성화된 경우 은행명, 예금주명, 계좌번호를 모두 입력해주세요.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await apiClient.updatePaymentMethods(paymentMethods);
      if (result.success) {
        toast.success(t('payment.saved'));
      } else {
        toast.error(result.error?.message || '저장에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error saving payment methods:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (method: 'cash' | 'card' | 'bankTransfer') => {
    setPaymentMethods((prev) => ({
      ...prev,
      [method]: {
        ...prev[method],
        enabled: !prev[method].enabled,
      },
    }));
  };

  const handleBankTransferChange = (field: 'bankName' | 'accountHolder' | 'accountNumber', value: string) => {
    setPaymentMethods((prev) => ({
      ...prev,
      bankTransfer: {
        ...prev.bankTransfer,
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">결제 방법을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", isEmbedded ? "px-6 pb-32 md:pb-6" : "mx-auto max-w-5xl px-6 pb-32 md:pb-6 pt-2")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{t('payment.title')}</h2>
            <p className="text-sm text-zinc-500 mt-1">고객이 사용할 수 있는 결제 방법을 설정합니다.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Cash Payment */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{t('payment.cash')}</h3>
                  <p className="text-sm text-zinc-500">현금 결제를 허용합니다.</p>
                </div>
              </div>
              <Switch
                checked={paymentMethods.cash.enabled}
                onCheckedChange={() => handleToggle('cash')}
              />
            </div>
          </div>

          {/* Credit Card Payment */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{t('payment.card')}</h3>
                  <p className="text-sm text-zinc-500">신용카드 결제를 허용합니다.</p>
                </div>
              </div>
              <Switch
                checked={paymentMethods.card.enabled}
                onCheckedChange={() => handleToggle('card')}
              />
            </div>
          </div>

          {/* Bank Transfer Payment */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{t('payment.bank_transfer')}</h3>
                  <p className="text-sm text-zinc-500">계좌이체 결제를 허용합니다.</p>
                </div>
              </div>
              <Switch
                checked={paymentMethods.bankTransfer.enabled}
                onCheckedChange={() => handleToggle('bankTransfer')}
              />
            </div>

            {paymentMethods.bankTransfer.enabled && (
              <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4">
                <div>
                  <Label htmlFor="bankName" className="text-sm font-medium text-zinc-700 mb-1.5 block">
                    {t('payment.bank_name')}
                  </Label>
                  <Select
                    value={paymentMethods.bankTransfer.bankName || ''}
                    onValueChange={(value) => handleBankTransferChange('bankName', value)}
                  >
                    <SelectTrigger id="bankName" className="w-full">
                      <SelectValue placeholder={t('payment.bank_name')} />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.shortName}>
                          <div className="flex items-center gap-2">
                            {bank.logo && (
                              <img src={bank.logo} alt={bank.shortName} className="w-5 h-5 object-contain" />
                            )}
                            <span>{bank.shortName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountHolder" className="text-sm font-medium text-zinc-700 mb-1.5 block">
                    {t('payment.account_holder')}
                  </Label>
                  <Input
                    id="accountHolder"
                    value={paymentMethods.bankTransfer.accountHolder || ''}
                    onChange={(e) => handleBankTransferChange('accountHolder', e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber" className="text-sm font-medium text-zinc-700 mb-1.5 block">
                    {t('payment.account_number')}
                  </Label>
                  <Input
                    id="accountNumber"
                    value={paymentMethods.bankTransfer.accountNumber || ''}
                    onChange={(e) => handleBankTransferChange('accountNumber', e.target.value)}
                    placeholder="예: 123-456-789012"
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            <Save size={16} />
            {t('payment.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
