import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { formatPriceVND } from '../../utils/priceFormat';
import { Order } from '../../data';
import { X, Banknote, CreditCard, Building2, Loader2 } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';
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
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

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

interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: number;
  orders: Order[];
  currentSessionId?: string | null; // 활성 세션 ID 추가
  onCheckoutComplete: () => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

export function CheckoutSheet({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  orders,
  currentSessionId,
  onCheckoutComplete,
}: CheckoutSheetProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId } = useUnifiedAuth();
  const isDesktop = useIsDesktop();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'bankTransfer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Filter served orders for checkout - only show orders from the active session
  const servedOrders = orders.filter(o => {
    // Must be served status and match table number
    if (o.status !== 'served' || o.tableId !== tableNumber) {
      return false;
    }
    // If table has an active session, only show orders from that session
    if (currentSessionId && o.sessionId) {
      return o.sessionId === currentSessionId;
    }
    // If no active session, don't show any orders (shouldn't happen in checkout)
    return false;
  });
  const totalAmount = servedOrders.reduce((sum, order) => {
    const orderAmount = order.totalAmount || 0;
    return sum + (typeof orderAmount === 'number' ? orderAmount : 0);
  }, 0);
  
  useEffect(() => {
    if (isOpen && restaurantId) {
      loadPaymentMethods();
    }
  }, [isOpen, restaurantId]);

  const loadPaymentMethods = async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const result = await apiClient.getPaymentMethods();
      if (result.success && result.data) {
        setPaymentMethods(result.data);
        // Auto-select first enabled payment method
        if (result.data.cash?.enabled) {
          setSelectedPaymentMethod('cash');
        } else if (result.data.card?.enabled) {
          setSelectedPaymentMethod('card');
        } else if (result.data.bankTransfer?.enabled) {
          setSelectedPaymentMethod('bankTransfer');
        }
      }
    } catch (error: unknown) {
      console.error('Error loading payment methods:', error);
      toast.error('결제 방법을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPaymentMethod) {
      toast.error(t('checkout.select_method'));
      return;
    }

    if (!restaurantId || !tableId) {
      toast.error('테이블 정보가 없습니다.');
      return;
    }

    setIsProcessing(true);
    try {
      // Update table status to cleaning
      const result = await apiClient.updateTableStatus(tableId, 'CLEANING');
      
      if (result.success) {
        toast.success(t('checkout.success'));
        onCheckoutComplete();
        onClose();
      } else {
        throw new Error(result.error?.message || '결제 처리에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('Error processing checkout:', error);
      const errorMessage = error instanceof Error ? error.message : '결제 처리에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const availablePaymentMethods = paymentMethods ? [
    paymentMethods.cash?.enabled && { key: 'cash', label: t('checkout.cash'), icon: Banknote },
    paymentMethods.card?.enabled && { key: 'card', label: t('checkout.card'), icon: CreditCard },
    paymentMethods.bankTransfer?.enabled && { key: 'bankTransfer', label: t('checkout.bank_transfer'), icon: Building2 },
  ].filter(Boolean) as Array<{ key: 'cash' | 'card' | 'bankTransfer'; label: string; icon: React.ElementType }> : [];

  const content = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 space-y-6 py-6">
            {/* Orders List */}
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                {t('checkout.orders')}
              </h3>
              <div className="space-y-3">
                {servedOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t('table.detail.no_orders')}
                  </div>
                ) : (
                  servedOrders.map((order) => (
                    <div key={order.id} className="bg-card border border-border p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {formatPriceVND(order.totalAmount)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => {
                          // item.price is already totalPrice (unitPrice * quantity + options)
                          // So we should use it directly, not multiply by quantity again
                          const itemTotal = item.price || (item.unitPrice ? item.unitPrice * item.quantity : 0);
                          return (
                            <li key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-foreground/80">{item.name} x{item.quantity}</span>
                              <span className="text-muted-foreground">{formatPriceVND(itemTotal)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            {servedOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  {t('checkout.payment_method')}
                </h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                  </div>
                ) : availablePaymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    활성화된 결제 방법이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availablePaymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedPaymentMethod === method.key;
                      return (
                        <button
                          key={method.key}
                          onClick={() => {
                            setSelectedPaymentMethod(method.key);
                            // If bank transfer is selected, open QR modal
                            if (method.key === 'bankTransfer' && paymentMethods?.bankTransfer?.enabled) {
                              setIsQRModalOpen(true);
                            }
                          }}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-border/70"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              <Icon size={20} />
                            </div>
                            <span className="font-medium text-foreground">{method.label}</span>
                            {isSelected && (
                              <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Total and Checkout Button */}
        {servedOrders.length > 0 && (
          <div className="border-t border-border p-6 bg-card shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{t('checkout.total')}</span>
              <span className="text-2xl font-bold text-foreground">{formatPriceVND(totalAmount)}</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                {t('checkout.cancel')}
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={!selectedPaymentMethod || isProcessing || availablePaymentMethods.length === 0}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    처리 중...
                  </>
                ) : (
                  t('checkout.complete')
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="right" className="w-full h-full sm:w-[540px] p-0 flex flex-col rounded-l-[32px] rounded-bl-[32px] border-none outline-none overflow-hidden">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-xl font-bold text-foreground">
                {t('checkout.title')} - 테이블 {tableNumber}
              </SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>

        {/* QR Code Modal */}
        {paymentMethods?.bankTransfer?.enabled && paymentMethods.bankTransfer.bankName && paymentMethods.bankTransfer.accountNumber && paymentMethods.bankTransfer.accountHolder && (
          <QRCodeModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            restaurantId={restaurantId || ''}
            tableNumber={tableNumber}
            totalAmount={totalAmount}
            bankInfo={{
              bankName: paymentMethods.bankTransfer.bankName,
              accountNumber: paymentMethods.bankTransfer.accountNumber,
              accountHolder: paymentMethods.bankTransfer.accountHolder,
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerTitle className="px-6 pt-6 pb-4 border-b border-border text-xl font-bold text-foreground">
            {t('checkout.title')} - 테이블 {tableNumber}
          </DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>

      {/* QR Code Modal */}
      {paymentMethods?.bankTransfer?.enabled && paymentMethods.bankTransfer.bankName && paymentMethods.bankTransfer.accountNumber && paymentMethods.bankTransfer.accountHolder && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          restaurantId={restaurantId || ''}
          tableNumber={tableNumber}
          totalAmount={totalAmount}
          bankInfo={{
            bankName: paymentMethods.bankTransfer.bankName,
            accountNumber: paymentMethods.bankTransfer.accountNumber,
            accountHolder: paymentMethods.bankTransfer.accountHolder,
          }}
        />
      )}
    </>
  );
}
