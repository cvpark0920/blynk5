import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { CartItem } from '../../types';
import { X, ArrowLeft, Download, Check, CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '../CurrencyDisplay';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTranslation } from '../../i18n/translations';
import { apiClient } from '../../../lib/api';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CartItem[];
  restaurantId: string | null;
  tableNumber: number | null;
  onPaymentRequest: (method: string) => void;
  onTransferComplete: () => void;
}

type BillStep = 'bill' | 'method' | 'qr';

export const BillModal: React.FC<BillModalProps> = ({ 
  isOpen, 
  onClose, 
  orders, 
  restaurantId,
  tableNumber,
  onPaymentRequest,
  onTransferComplete 
}) => {
  const { lang } = useLanguage();
  const [step, setStep] = useState<BillStep>('bill');
  const dragControls = useDragControls();
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null>(null);

  const total = orders.reduce((sum, item) => {
    const basePrice = item.priceVND || 0;
    const optionsPrice = item.selectedOptions?.reduce((s, o) => s + (o.priceVND || 0), 0) || 0;
    const itemTotal = (basePrice + optionsPrice) * (item.quantity || 1);
    return sum + itemTotal;
  }, 0);

  // 디버깅: orders와 total 값 확인
  useEffect(() => {
    if (isOpen && orders.length > 0) {
      console.log('BillModal - orders:', orders);
      console.log('BillModal - total:', total);
      orders.forEach((item, idx) => {
        console.log(`Item ${idx}:`, {
          name: item.nameKO,
          priceVND: item.priceVND,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          itemTotal: (item.priceVND || 0) * (item.quantity || 1),
        });
      });
    }
  }, [isOpen, orders, total]);

  // Reset step when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setStep('bill');
      setQrCodeUrl(null);
      setBankInfo(null);
    }
  }, [isOpen]);

  // Load payment methods and generate QR code when entering QR step
  useEffect(() => {
    if (step === 'qr' && restaurantId && !qrCodeUrl && !isLoadingQR) {
      loadQRCode();
    }
  }, [step, restaurantId, qrCodeUrl, isLoadingQR]);

  const loadQRCode = async () => {
    if (!restaurantId) {
      toast.error(getTranslation('toast.restaurantNotFound', lang));
      return;
    }

    setIsLoadingQR(true);
    try {
      // First, get payment methods to check if bank transfer is enabled
      const paymentMethodsResponse = await apiClient.getPaymentMethods(restaurantId);
      
      if (!paymentMethodsResponse.success || !paymentMethodsResponse.data) {
        throw new Error(paymentMethodsResponse.error?.message || 'Failed to load payment methods');
      }

      const bankTransfer = paymentMethodsResponse.data.bankTransfer;
      
      if (!bankTransfer.enabled) {
        toast.error(getTranslation('toast.bankTransferDisabled', lang));
        setStep('method');
        return;
      }

      if (!bankTransfer.bankName || !bankTransfer.accountNumber || !bankTransfer.accountHolder) {
        toast.error(getTranslation('toast.accountInfoMissing', lang));
        setStep('method');
        return;
      }

      // Generate QR code
      const qrResponse = await apiClient.generateQRCode({
        restaurantId,
        amount: total,
        memo: lang === 'ko' ? `테이블 ${tableNumber}` : lang === 'vn' ? `Bàn ${tableNumber}` : `Table ${tableNumber}`,
        tableNumber: tableNumber || undefined,
      });

      if (!qrResponse.success || !qrResponse.data) {
        throw new Error(qrResponse.error?.message || 'Failed to generate QR code');
      }

      setQrCodeUrl(qrResponse.data.qrCodeUrl);
      setBankInfo({
        bankName: qrResponse.data.bankName,
        accountNumber: qrResponse.data.accountNumber,
        accountHolder: qrResponse.data.accountHolder,
      });
    } catch (error: any) {
      console.error('Failed to load QR code:', error);
      toast.error(getTranslation('toast.qrGenerateFailed', lang));
      setStep('method');
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrCodeUrl) {
      toast.error(getTranslation('toast.qrCodeMissing', lang));
      return;
    }

    try {
      // Fetch the QR code image
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${tableNumber || 'payment'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const message = getTranslation('bill.qrSaved', lang);
      toast.success(message, {
        description: getTranslation('toast.imageSaved', lang)
      });
    } catch (error) {
      console.error('Failed to download QR code:', error);
      toast.error(getTranslation('toast.qrDownloadFailed', lang));
    }
  };

  const StepHeader = () => (
    <div 
      className="relative flex items-center justify-between p-4 pt-5 border-b border-gray-100 bg-white cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={(e) => dragControls.start(e)}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-100 rounded-full" />

      <div className="flex items-center gap-2">
        {step !== 'bill' && (
          <button onClick={() => setStep('bill')} className="p-1 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="text-xl font-bold text-gray-900">
          {step === 'bill' && getTranslation('bill.title', lang)}
          {step === 'method' && getTranslation('bill.paymentMethod', lang)}
          {step === 'qr' && getTranslation('bill.transfer', lang)}
        </h2>
      </div>
      <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
        <X size={24} />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white flex flex-col h-[85%] rounded-t-2xl shadow-2xl overflow-hidden"
          >
             <StepHeader />

             <div className="flex-1 overflow-y-auto bg-gray-50/50">
               {/* STEP 1: BILL DETAILS */}
               {step === 'bill' && (
                 <>
                   <div className="p-4 space-y-4">
                     {orders.length === 0 ? (
                       <div className="text-center text-gray-500 py-10">
                         {getTranslation('bill.noOrders', lang)}
                       </div>
                     ) : (
                       orders.map((item, idx) => {
                         const unitPrice = item.priceVND + (item.selectedOptions?.reduce((s,o)=>s+o.priceVND,0) || 0);
                         const totalPrice = unitPrice * item.quantity;
                         return (
                           <div key={`${item.id}-${idx}`} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                <img src={item.imageQuery} alt={item.nameKO} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                {(() => {
                                  const itemName = lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
                                  const itemSub = lang === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
                                  return (
                                    <>
                                      <div className="font-medium text-gray-900 leading-tight">{itemName}</div>
                                      
                                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                                          {item.selectedOptions.map((opt, i) => {
                                            const optLabel = lang === 'ko' ? opt.labelKO : lang === 'vn' ? opt.labelVN : (opt.labelEN || opt.labelKO);
                                            return (
                                              <div key={i} className="flex items-center gap-1">
                                                <span>• {optLabel}</span>
                                                {opt.priceVND > 0 && <span className="text-gray-400">(+{opt.priceVND.toLocaleString()})</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-gray-500 mt-0.5">{itemSub}</div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <div className="text-xs text-gray-500">
                                {unitPrice.toLocaleString('vi-VN')}₫ × {item.quantity}
                              </div>
                              <CurrencyDisplay amountVND={totalPrice} className="font-bold" />
                            </div>
                          </div>
                         );
                       })
                     )}
                   </div>
                   
                   {orders.length > 0 && (
                     <div className="p-4 bg-white border-t border-gray-100 absolute bottom-0 w-full pb-safe">
                       <div className="flex justify-between items-center mb-4">
                         <span className="font-bold text-lg">{getTranslation('bill.total', lang)}</span>
                         <CurrencyDisplay amountVND={total} className="text-xl font-bold text-blue-600" />
                       </div>
                       <Button 
                        onClick={() => setStep('method')}
                        className="w-full h-12 text-lg bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                      >
                         {getTranslation('bill.pay', lang)}
                       </Button>
                     </div>
                   )}
                 </>
               )}

               {/* STEP 2: PAYMENT METHOD */}
               {step === 'method' && (
                 <div className="p-6 space-y-4 flex flex-col items-center justify-center h-full">
                   <p className="text-center text-gray-500 mb-4">{getTranslation('bill.selectPayment', lang)}</p>
                   
                   <Button 
                    onClick={() => setStep('qr')}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 text-blue-700"
                   >
                     <QrCode size={28} />
                     <span className="font-bold">{getTranslation('bill.bankTransfer', lang)}</span>
                   </Button>

                   <Button 
                    onClick={() => onPaymentRequest(lang === 'ko' ? '현금' : lang === 'vn' ? 'Tiền mặt' : 'Cash')}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center hover:bg-gray-50"
                   >
                     <Banknote size={28} className="text-green-600" />
                     <span className="font-medium text-gray-900">{getTranslation('bill.cash', lang)}</span>
                   </Button>

                   <Button 
                    onClick={() => onPaymentRequest(lang === 'ko' ? '신용카드' : lang === 'vn' ? 'Thẻ tín dụng' : 'Credit Card')}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center hover:bg-gray-50"
                   >
                     <CreditCard size={28} className="text-purple-600" />
                     <span className="font-medium text-gray-900">{getTranslation('bill.creditCard', lang)}</span>
                   </Button>
                 </div>
               )}

               {/* STEP 3: QR CODE */}
               {step === 'qr' && (
                 <div className="flex flex-col h-full">
                   {isLoadingQR ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-6">
                       <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                       <p className="text-gray-500">
                         {lang === 'ko' ? 'QR 코드 생성 중...' : lang === 'vn' ? 'Đang tạo mã QR...' : 'Generating QR code...'}
                       </p>
                     </div>
                   ) : qrCodeUrl && bankInfo ? (
                     <>
                       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                           {/* Actual QR Code Image */}
                           <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-gray-200">
                             <img 
                               src={qrCodeUrl} 
                               alt="QR Code" 
                               className="w-full h-full object-contain"
                               onError={(e) => {
                                 // Fallback to placeholder if image fails to load
                                 const target = e.target as HTMLImageElement;
                                 target.style.display = 'none';
                                 const placeholder = target.parentElement?.querySelector('.qr-placeholder');
                                 if (placeholder) {
                                   (placeholder as HTMLElement).style.display = 'flex';
                                 }
                               }}
                             />
                             {/* Placeholder fallback */}
                             <div className="qr-placeholder hidden absolute inset-0 bg-gray-900 flex items-center justify-center">
                               <div className="absolute inset-2 bg-white flex items-center justify-center">
                                 <QrCode size={120} className="text-gray-900" />
                               </div>
                               {/* Decorative corners */}
                               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-black rounded-tl-lg" />
                               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-black rounded-tr-lg" />
                               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-black rounded-bl-lg" />
                               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-black rounded-br-lg" />
                             </div>
                           </div>
                         </div>

                         <div className="space-y-1">
                           <div className="text-sm text-gray-500">
                             {bankInfo.bankName}
                           </div>
                           <div className="text-xl font-bold tracking-wider">{bankInfo.accountNumber}</div>
                           <div className="text-sm text-gray-400">
                             {lang === 'ko' ? `예금주: ${bankInfo.accountHolder}` : lang === 'vn' ? `Chủ tài khoản: ${bankInfo.accountHolder}` : `Account Holder: ${bankInfo.accountHolder}`}
                           </div>
                         </div>

                         <div className="bg-blue-50 px-6 py-3 rounded-xl">
                           <span className="text-blue-600 font-bold text-2xl">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                           </span>
                         </div>
                       </div>

                       <div className="p-4 bg-white border-t border-gray-100 space-y-3 pb-safe">
                         <Button 
                           onClick={handleDownloadQR}
                           variant="outline"
                           className="w-full h-12 text-base font-medium flex items-center justify-center gap-2"
                         >
                           <Download size={18} />
                           {getTranslation('bill.qrDownload', lang)}
                         </Button>
                         <Button 
                           onClick={onTransferComplete}
                           className="w-full h-12 text-lg bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2"
                         >
                           <Check size={18} />
                           {getTranslation('bill.transferComplete', lang)}
                         </Button>
                       </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center p-6">
                       <p className="text-gray-500 mb-4">
                         {lang === 'ko' ? 'QR 코드를 불러올 수 없습니다.' : lang === 'vn' ? 'Không thể tải mã QR.' : 'Unable to load QR code.'}
                       </p>
                       <Button 
                         onClick={() => setStep('method')}
                         variant="outline"
                       >
                         {lang === 'ko' ? '돌아가기' : lang === 'vn' ? 'Quay lại' : 'Go Back'}
                       </Button>
                     </div>
                   )}
                 </div>
               )}
             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};