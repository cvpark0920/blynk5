import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { CartItem } from '../../types';
import { X, ArrowLeft, Download, Check, CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '../CurrencyDisplay';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTranslation } from '../../i18n/translations';
import { apiClient, Promotion } from '../../../lib/api';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CartItem[];
  restaurantId: string | null;
  tableNumber: number | null;
  onPaymentRequest: (method: string) => void;
  onTransferComplete: () => void;
  promotions?: Promotion[];
}

type BillStep = 'bill' | 'method' | 'qr';

export const BillModal: React.FC<BillModalProps> = ({ 
  isOpen, 
  onClose, 
  orders, 
  restaurantId,
  tableNumber,
  onPaymentRequest,
  onTransferComplete,
  promotions = []
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

  // 프로모션 할인 계산 함수들
  const getActivePromotionForMenuItem = (menuItemId: string) => {
    const now = new Date();
    return promotions.find(promo => {
      if (!promo.isActive || !promo.discountPercent) return false;
      const startDate = new Date(promo.startDate);
      const endDate = new Date(promo.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (now < startDate || now > endDate) return false;
      
      // 메뉴 항목이 프로모션에 포함되는지 확인
      const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                          promo.menuItems?.map(mi => mi.id) || [];
      return menuItemIds.includes(menuItemId);
    });
  };

  const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
    if (!discountPercent) return originalPrice;
    return Math.floor(originalPrice * (1 - discountPercent / 100));
  };

  const total = orders.reduce((sum, item) => {
    // 프로모션 할인 적용
    const activePromotion = getActivePromotionForMenuItem(item.id);
    const originalUnitPrice = (item as any).unitPrice || item.priceVND || 0;
    const discountedUnitPrice = activePromotion 
      ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
      : originalUnitPrice;
    
    // 옵션 총액 계산 (옵션은 할인 대상이 아님)
    const optionsTotal = item.selectedOptions?.reduce((optSum, opt) => {
      const optPrice = opt.priceVND || 0;
      const optQuantity = (opt as any).quantity || 1;
      return optSum + (optPrice * optQuantity);
    }, 0) || 0;
    
    // 주문 항목 총액 = (할인된 단가 × 수량) + 옵션 총액
    const itemTotal = (discountedUnitPrice * (item.quantity || 1)) + optionsTotal;
    return sum + itemTotal;
  }, 0);

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
        memo: getTranslation('bill.tableLabel', lang).replace('{n}', String(tableNumber ?? '')),
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
      className="relative flex items-center justify-between p-4 pt-5 border-b border-border bg-card cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={(e) => dragControls.start(e)}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full" />

      <div className="flex items-center gap-2">
        {step !== 'bill' && (
          <button onClick={() => setStep('bill')} className="p-1 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="text-xl font-bold text-foreground">
          {step === 'bill' && getTranslation('bill.title', lang)}
          {step === 'method' && getTranslation('bill.paymentMethod', lang)}
          {step === 'qr' && getTranslation('bill.transfer', lang)}
        </h2>
      </div>
      <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
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
            className="fixed inset-x-0 bottom-0 z-50 bg-card flex flex-col h-[90%] rounded-t-2xl shadow-2xl overflow-hidden text-foreground"
          >
             <StepHeader />

             <div
               className="flex-1 overflow-y-auto bg-muted/40 overscroll-contain touch-pan-y"
               style={{ WebkitOverflowScrolling: 'touch' }}
             >
               {/* STEP 1: BILL DETAILS */}
               {step === 'bill' && (
                 <>
                   <div className="p-4 space-y-4">
                     {orders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                         {getTranslation('bill.noOrders', lang)}
                       </div>
                     ) : (
                       orders.map((item, idx) => {
                         // 프로모션 할인 적용
                         const activePromotion = getActivePromotionForMenuItem(item.id);
                         const originalUnitPrice = (item as any).unitPrice || item.priceVND || 0;
                         const discountedUnitPrice = activePromotion 
                           ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                           : originalUnitPrice;
                         
                         // 옵션 총액 계산 (옵션은 할인 대상이 아님)
                         const optionsTotal = item.selectedOptions?.reduce((sum, opt) => {
                           const optPrice = opt.priceVND || 0;
                           const optQuantity = (opt as any).quantity || 1;
                           return sum + (optPrice * optQuantity);
                         }, 0) || 0;
                         
                         // 주문 항목 총액 = (할인된 단가 × 수량) + 옵션 총액
                         const totalPrice = (discountedUnitPrice * item.quantity) + optionsTotal;
                         
                         return (
                          <div key={`${item.id}-${idx}`} className="flex justify-between items-start py-3 border-b border-border last:border-0">
                            <div className="flex items-start gap-3">
                             <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                                <img src={item.imageQuery} alt={item.nameKO} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                {(() => {
                                  const itemName = lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : lang === 'zh' ? (item.nameZH || item.nameEN || item.nameKO) : lang === 'ru' ? (item.nameRU || item.nameEN || item.nameKO) : (item.nameEN || item.nameKO);
                                  const itemSub = lang === 'vn' ? (item.nameEN || item.nameKO) : lang === 'zh' ? item.nameVN : lang === 'ru' ? item.nameVN : item.nameVN;
                                  return (
                                    <>
                                      <div className="font-medium text-foreground leading-tight">{itemName}</div>
                                      
                                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                          {item.selectedOptions.map((opt, i) => {
                                            const optLabel = lang === 'ko' ? opt.labelKO : lang === 'vn' ? opt.labelVN : lang === 'zh' ? (opt.labelZH || opt.labelEN || opt.labelKO) : (opt.labelEN || opt.labelKO);
                                            const optQuantity = (opt as any).quantity || 1;
                                            const optPrice = opt.priceVND || 0;
                                            return (
                                              <div key={i} className="flex items-center justify-between gap-1">
                                                <span>• {optLabel} {optQuantity > 1 ? `× ${optQuantity}` : ''}</span>
                                                {optPrice > 0 && <span className="text-muted-foreground/80">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(optPrice * optQuantity)}</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-muted-foreground mt-0.5">{itemSub}</div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                             <div className="text-xs text-muted-foreground">
                                {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                  <span className="flex items-center gap-1">
                                    <span className="line-through opacity-60">
                                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalUnitPrice)}
                                    </span>
                                    <span>
                                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {item.quantity}
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {item.quantity}
                                  </span>
                                )}
                              </div>
                              <CurrencyDisplay amountVND={totalPrice} className="font-bold" />
                            </div>
                          </div>
                         );
                       })
                     )}
                   </div>
                   
                   {orders.length > 0 && (
                    <div className="p-4 bg-card/95 backdrop-blur border-t border-border sticky bottom-0 w-full pb-safe z-10">
                       <div className="flex justify-between items-center mb-4">
                         <span className="font-bold text-lg">{getTranslation('bill.total', lang)}</span>
                        <CurrencyDisplay amountVND={total} className="text-xl font-bold text-primary" />
                       </div>
                       <Button 
                        onClick={() => setStep('method')}
                        className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
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
                   <p className="text-center text-muted-foreground mb-4">{getTranslation('bill.selectPayment', lang)}</p>
                   
                   <Button 
                    onClick={() => setStep('qr')}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center border-2 border-primary/20 bg-primary/10 hover:bg-primary/15 hover:border-primary/30 text-primary"
                   >
                     <QrCode size={28} />
                     <span className="font-bold">{getTranslation('bill.bankTransfer', lang)}</span>
                   </Button>

                   <Button 
                    onClick={() => onPaymentRequest(getTranslation('bill.cash', lang))}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center hover:bg-muted"
                   >
                     <Banknote size={28} className="text-secondary-foreground" />
                     <span className="font-medium text-foreground">{getTranslation('bill.cash', lang)}</span>
                   </Button>

                   <Button 
                    onClick={() => onPaymentRequest(getTranslation('bill.creditCard', lang))}
                    variant="outline"
                    className="w-full h-20 text-lg flex flex-col gap-1 items-center justify-center hover:bg-muted"
                   >
                     <CreditCard size={28} className="text-accent-foreground" />
                     <span className="font-medium text-foreground">{getTranslation('bill.creditCard', lang)}</span>
                   </Button>
                 </div>
               )}

               {/* STEP 3: QR CODE */}
               {step === 'qr' && (
                 <div className="flex flex-col h-full">
                   {isLoadingQR ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-6">
                       <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                       <p className="text-muted-foreground">
                         {getTranslation('bill.qrGenerating', lang)}
                       </p>
                     </div>
                   ) : qrCodeUrl && bankInfo ? (
                     <>
                       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
                           {/* Actual QR Code Image */}
                          <div className="w-48 h-48 bg-card rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-border">
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
                            <div className="qr-placeholder hidden absolute inset-0 bg-foreground flex items-center justify-center">
                              <div className="absolute inset-2 bg-card flex items-center justify-center">
                                <QrCode size={120} className="text-foreground" />
                               </div>
                               {/* Decorative corners */}
                              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-foreground rounded-tl-lg" />
                              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-foreground rounded-tr-lg" />
                              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-foreground rounded-bl-lg" />
                              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-foreground rounded-br-lg" />
                             </div>
                           </div>
                         </div>

                         <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                             {bankInfo.bankName}
                           </div>
                          <div className="text-xl font-bold tracking-wider text-foreground">{bankInfo.accountNumber}</div>
                          <div className="text-sm text-muted-foreground">
                             {getTranslation('bill.accountHolderLabel', lang)}: {bankInfo.accountHolder}
                           </div>
                          <div className="pt-2 mt-2 border-t border-border/50">
                            <div className="text-xs text-muted-foreground mb-1">
                              {getTranslation('bill.transferAmount', lang)}
                            </div>
                            <div className="text-xl font-bold text-primary">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                            </div>
                          </div>
                         </div>
                       </div>

                      <div className="p-4 bg-card border-t border-border space-y-3 pb-safe">
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
                          className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2"
                         >
                           <Check size={18} />
                           {getTranslation('bill.transferComplete', lang)}
                         </Button>
                       </div>
                     </>
                   ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                      <p className="text-muted-foreground mb-4">
                         {getTranslation('toast.qrLoadFailed', lang)}
                       </p>
                       <Button 
                         onClick={() => setStep('method')}
                         variant="outline"
                       >
                         {getTranslation('common.goBack', lang)}
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