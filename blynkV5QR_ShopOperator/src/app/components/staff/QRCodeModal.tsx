import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { X, QrCode, Loader2, Download, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { formatPriceVND } from '../../utils/priceFormat';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  tableNumber: number;
  totalAmount: number;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024); // lg breakpoint for desktop
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

export function QRCodeModal({
  isOpen,
  onClose,
  restaurantId,
  tableNumber,
  totalAmount,
  bankInfo,
}: QRCodeModalProps) {
  const debugLog = (..._args: unknown[]) => {};
  const { t, language } = useLanguage();
  const isDesktop = useIsDesktop();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ensure totalAmount is a valid number
  // Handle null, undefined, or invalid values
  const validAmount = (totalAmount != null && typeof totalAmount === 'number' && !isNaN(totalAmount) && totalAmount > 0) 
    ? totalAmount 
    : 0;
  
  useEffect(() => {
    if (isOpen) {
      debugLog('QRCodeModal props:', {
        totalAmount,
        validAmount,
        totalAmountType: typeof totalAmount,
        isNumber: typeof totalAmount === 'number',
        isNull: totalAmount === null,
        isUndefined: totalAmount === undefined,
        isNaN: typeof totalAmount === 'number' ? isNaN(totalAmount) : 'N/A',
      });
    }
  }, [isOpen, totalAmount, validAmount]);

  useEffect(() => {
    if (isOpen && bankInfo.bankName && bankInfo.accountNumber) {
      generateQRCode();
    } else if (isOpen) {
      setQrCodeUrl(null);
    }
  }, [isOpen, bankInfo.bankName, bankInfo.accountNumber, validAmount, tableNumber]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setQrCodeUrl(null);
    
    try {
      // First, get bank BIN code from bank name
      const banksResponse = await apiClient.getBanks();
      if (!banksResponse.success || !banksResponse.data) {
        throw new Error('은행 목록을 불러올 수 없습니다.');
      }

      const banks = banksResponse.data;
      const bank = banks.find((b: any) => b.shortName === bankInfo.bankName);
      
      if (!bank || !bank.bin) {
        console.error('Bank not found:', {
          bankName: bankInfo.bankName,
          availableBanks: banks.map((b: any) => b.shortName),
        });
        throw new Error(`은행 정보를 찾을 수 없습니다: ${bankInfo.bankName}`);
      }

      // Validate account number format
      if (!bankInfo.accountNumber || bankInfo.accountNumber.trim() === '') {
        console.error('Account number is empty:', bankInfo);
        throw new Error('계좌번호가 올바르지 않습니다.');
      }

      // Generate QR code
      // Note: memo is temporarily excluded due to VietQR URL formatting issues
      debugLog('Generating QR code with params:', {
        bankId: bank.bin,
        accountNo: bankInfo.accountNumber,
        accountName: bankInfo.accountHolder,
        amount: totalAmount,
        totalAmountType: typeof totalAmount,
        totalAmountValue: totalAmount,
        // memo excluded temporarily
      });

      const qrResponse = await apiClient.generateQRCode({
        bankId: bank.bin,
        accountNo: bankInfo.accountNumber,
        accountName: bankInfo.accountHolder,
        // Only include amount if it's a valid number greater than 0
        amount: validAmount > 0 ? validAmount : undefined,
        // Include table number in memo
        memo: language === 'ko' ? `테이블 ${tableNumber}` : language === 'vn' ? `Bàn ${tableNumber}` : `Table ${tableNumber}`,
      });

      debugLog('QR API Response:', {
        success: qrResponse.success,
        data: qrResponse.data,
        error: qrResponse.error,
        dataType: typeof qrResponse.data,
      });

      if (!qrResponse.success || !qrResponse.data) {
        throw new Error(qrResponse.error?.message || 'QR 코드 생성에 실패했습니다.');
      }

      // Handle different response formats
      // 백엔드에서 이미 처리된 qrCodeUrl 문자열을 받음
      let qrUrl: string;
      if (typeof qrResponse.data === 'string') {
        qrUrl = qrResponse.data;
        debugLog('QR URL extracted (string):', qrUrl);
      } else if (qrResponse.data && typeof qrResponse.data === 'object') {
        // 백엔드에서 처리하지 못한 경우를 대비한 폴백
        debugLog('QR response is object, keys:', Object.keys(qrResponse.data));
        if ('data' in qrResponse.data && typeof qrResponse.data.data === 'string') {
          qrUrl = qrResponse.data.data;
          debugLog('QR URL extracted (data.data):', qrUrl);
        } else if ('qrDataURL' in qrResponse.data && typeof qrResponse.data.qrDataURL === 'string') {
          qrUrl = qrResponse.data.qrDataURL;
          debugLog('QR URL extracted (qrDataURL):', qrUrl);
        } else {
          console.error('Unexpected QR response format:', qrResponse.data);
          throw new Error('QR 코드 응답 형식이 올바르지 않습니다.');
        }
      } else {
        console.error('Invalid QR response data type:', typeof qrResponse.data);
        throw new Error('QR 코드 응답 형식이 올바르지 않습니다.');
      }

      // Validate URL format
      if (!qrUrl || (!qrUrl.startsWith('http://') && !qrUrl.startsWith('https://') && !qrUrl.startsWith('data:'))) {
        console.error('Invalid QR URL format:', qrUrl);
        throw new Error('유효하지 않은 QR 코드 URL 형식입니다.');
      }

      debugLog('Final QR URL to display:', qrUrl);
      setQrCodeUrl(qrUrl);
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      toast.error(error.message || 'QR 코드 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrCodeUrl) {
      toast.error('QR 코드가 없습니다.');
      return;
    }

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-table-${tableNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(language === 'ko' ? 'QR 코드가 다운로드되었습니다.' : language === 'vn' ? 'Mã QR đã được tải xuống.' : 'QR code downloaded.');
    } catch (error) {
      console.error('Failed to download QR code:', error);
      toast.error(language === 'ko' ? 'QR 코드 다운로드에 실패했습니다.' : language === 'vn' ? 'Không thể tải mã QR.' : 'Failed to download QR code.');
    }
  };

  const handleCopyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(bankInfo.accountNumber);
      setCopied(true);
      toast.success(language === 'ko' ? '계좌번호가 복사되었습니다.' : language === 'vn' ? 'Số tài khoản đã được sao chép.' : 'Account number copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy account number:', error);
      toast.error(language === 'ko' ? '계좌번호 복사에 실패했습니다.' : language === 'vn' ? 'Không thể sao chép số tài khoản.' : 'Failed to copy account number.');
    }
  };

  const scrollableContent = (
    <div className="max-w-md mx-auto space-y-6 py-6 px-6">
      {/* QR Code */}
      <div className="flex flex-col items-center space-y-4">
        {isLoading ? (
          <div className="w-64 h-64 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Loader2 className="animate-spin text-zinc-400" size={48} />
          </div>
        ) : qrCodeUrl ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
            <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-zinc-200">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-full h-full object-contain"
                onLoad={() => {
                  debugLog('QR code image loaded successfully:', qrCodeUrl);
                }}
                onError={(e) => {
                  console.error('QR code image failed to load:', qrCodeUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.parentElement?.querySelector('.qr-placeholder');
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              {/* Placeholder fallback */}
              <div className="qr-placeholder hidden absolute inset-0 bg-zinc-900 flex items-center justify-center">
                <div className="absolute inset-2 bg-white flex items-center justify-center">
                  <QrCode size={120} className="text-zinc-900" />
                </div>
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-black rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-black rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-black rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-black rounded-br-lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-64 h-64 bg-zinc-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-zinc-400">
              <QrCode size={48} className="mx-auto mb-2" />
              <p className="text-sm">QR 코드를 생성할 수 없습니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bank Account Info */}
      <div className="bg-white border border-zinc-100 rounded-xl p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-sm text-zinc-500">
            {language === 'ko' ? '입금 계좌' : language === 'vn' ? 'Tài khoản nhận tiền' : 'Deposit Account'}
          </div>
          <div className="text-lg font-bold text-zinc-900">
            {bankInfo.bankName}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-xl font-bold tracking-wider text-zinc-900">
              {bankInfo.accountNumber}
            </div>
            <button
              onClick={handleCopyAccountNumber}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
              title={language === 'ko' ? '계좌번호 복사' : language === 'vn' ? 'Sao chép số tài khoản' : 'Copy account number'}
            >
              {copied ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} className="text-zinc-600" />
              )}
            </button>
          </div>
          <div className="text-sm text-zinc-400">
            {language === 'ko' ? `예금주: ${bankInfo.accountHolder}` : language === 'vn' ? `Chủ tài khoản: ${bankInfo.accountHolder}` : `Account Holder: ${bankInfo.accountHolder}`}
          </div>
          <div className="pt-2 border-t border-zinc-100">
            <div className="text-xs text-zinc-500 mb-1">
              {language === 'ko' ? '입금 금액' : language === 'vn' ? 'Số tiền cần chuyển' : 'Transfer Amount'}
            </div>
            <div className="text-xl font-bold text-blue-600">
              {formatPriceVND(validAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-2 text-sm text-zinc-600">
        <p className="font-medium">
          {language === 'ko' ? '고객 안내' : language === 'vn' ? 'Hướng dẫn khách hàng' : 'Customer Instructions'}
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            {language === 'ko' 
              ? 'QR 코드를 스캔하거나 계좌번호를 복사하여 입금해주세요.'
              : language === 'vn'
              ? 'Vui lòng quét mã QR hoặc sao chép số tài khoản để chuyển tiền.'
              : 'Please scan the QR code or copy the account number to transfer.'}
          </li>
          <li>
            {language === 'ko'
              ? '정확한 금액을 입금해주세요.'
              : language === 'vn'
              ? 'Vui lòng chuyển đúng số tiền.'
              : 'Please transfer the exact amount.'}
          </li>
        </ul>
      </div>
    </div>
  );

  const content = (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        {scrollableContent}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-zinc-100 p-6 bg-white space-y-3 shrink-0">
        {qrCodeUrl && (
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="w-full"
          >
            <Download size={18} className="mr-2" />
            {language === 'ko' ? 'QR 코드 다운로드' : language === 'vn' ? 'Tải mã QR' : 'Download QR Code'}
          </Button>
        )}
        <Button
          onClick={onClose}
          className="w-full bg-zinc-900 hover:bg-zinc-800"
        >
          {language === 'ko' ? '닫기' : language === 'vn' ? 'Đóng' : 'Close'}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 shrink-0">
            <DialogTitle className="text-xl font-bold text-zinc-900">
              {language === 'ko' ? '계좌이체 QR 코드' : language === 'vn' ? 'Mã QR chuyển khoản' : 'Bank Transfer QR Code'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerTitle className="px-6 pt-6 pb-4 border-b border-zinc-100 text-xl font-bold text-zinc-900 shrink-0">
          {language === 'ko' ? '계좌이체 QR 코드' : language === 'vn' ? 'Mã QR chuyển khoản' : 'Bank Transfer QR Code'}
        </DrawerTitle>
        <div className="flex-1 min-h-0 flex flex-col">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
