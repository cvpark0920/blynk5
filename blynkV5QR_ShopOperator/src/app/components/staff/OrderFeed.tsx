import React, { useState, useEffect } from 'react';
import { Order } from '../../data';
import { ChefHat, CircleCheck, Clock, UtensilsCrossed, ArrowRight, Timer, Hash, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { formatPriceVND } from '../../utils/priceFormat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BackendPromotion } from '../../types/api';

interface OrderFeedProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrdersReload?: () => void;
}

export function OrderFeed({ orders, setOrders, onOrdersReload, menu = [], promotions = [] }: OrderFeedProps & { menu?: Array<{ id: string; name: string; imageUrl?: string }>; promotions?: BackendPromotion[] }) {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const mobile = width < 768;
    if (import.meta.env.DEV) {
      console.log('[OrderFeed] Initial isMobile check:', { width, mobile });
    }
    return mobile;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      if (import.meta.env.DEV) {
        console.log('[OrderFeed] Resize check:', { width, mobile });
      }
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking' | 'served'>('pending');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const foodOrders = orders.filter(o => 
    o.type === 'order' && 
    (o.status === 'pending' || o.status === 'confirmed' || o.status === 'cooking' || o.status === 'served')
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const pendingOrders = foodOrders.filter(o => o.status === 'pending');
  const confirmedOrders = foodOrders.filter(o => o.status === 'confirmed');
  const cookingOrders = foodOrders.filter(o => o.status === 'cooking');
  const servedOrders = foodOrders.filter(o => o.status === 'served');

  // Group orders by tableId
  const groupOrdersByTable = (ordersList: Order[]) => {
    const grouped = ordersList.reduce((acc, order) => {
      const tableId = order.tableId || 'Unknown';
      if (!acc[tableId]) {
        acc[tableId] = [];
      }
      acc[tableId].push(order);
      return acc;
    }, {} as Record<string, Order[]>);

    // Sort orders within each table group by timestamp
    Object.keys(grouped).forEach(tableId => {
      grouped[tableId].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });

    // Sort table groups by the earliest order timestamp
    return Object.entries(grouped).sort((a, b) => {
      const aEarliest = a[1][0]?.timestamp.getTime() || 0;
      const bEarliest = b[1][0]?.timestamp.getTime() || 0;
      return aEarliest - bEarliest;
    });
  };

  const pendingOrdersByTable = groupOrdersByTable(pendingOrders);
  const confirmedOrdersByTable = groupOrdersByTable(confirmedOrders);
  const cookingOrdersByTable = groupOrdersByTable(cookingOrders);
  const servedOrdersByTable = groupOrdersByTable(servedOrders);

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrderId(orderId);
    try {
      // Map frontend status to backend status (uppercase)
      const backendStatus = newStatus.toUpperCase();
      const result = await apiClient.updateOrderStatus(orderId, backendStatus);
      
      if (result.success) {
        // Update local state optimistically
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        
        // Reload orders to ensure consistency
        if (onOrdersReload) {
          onOrdersReload();
        }
        
        if (newStatus === 'confirmed') {
          toast.success(t('msg.confirm_success') || t('msg.order_confirmed') || '주문 확인 완료');
        } else if (newStatus === 'cooking') {
          toast.success(t('msg.cooking_started') || "Order started cooking");
        } else if (newStatus === 'served') {
          toast.success(t('msg.cooking_done') || "조리 완료");
        } else if (newStatus === 'delivered') {
          toast.success(t('order.action.mark_served') || "서빙 완료");
        } else if (newStatus === 'cancelled') {
          toast.success(t('msg.reject_success') || t('msg.order_rejected') || '주문 취소 완료');
        }
      } else {
        throw new Error(result.error?.message || 'Failed to update order status');
      }
    } catch (error: unknown) {
      console.error('Error updating order status:', error);
      toast.error(t('msg.update_failed') || '주문 상태 업데이트에 실패했습니다.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    await handleUpdateStatus(orderId, 'cancelled');
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-24 min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <UtensilsCrossed size={20} className="text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-500">{message}</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'cooking' | 'served')} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 shrink-0">
          <TabsList className="bg-muted/60 p-0.5 h-9 w-full gap-1 rounded-lg">
            <TabsTrigger value="pending" className={`flex-1 gap-1 ${isMobile ? '' : 'md:gap-1.5'} px-2 ${isMobile ? '' : 'md:px-3'} py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0 whitespace-nowrap`}>
              <ChefHat size={14} />
              {!isMobile && (
                <span className="text-xs font-semibold">{t('feed.tab.new_orders')}</span>
              )}
              <span className="text-[11px] bg-background/80 data-[state=active]:bg-primary/20 text-muted-foreground data-[state=active]:text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                {pendingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="cooking" className={`flex-1 gap-1 ${isMobile ? '' : 'md:gap-1.5'} px-2 ${isMobile ? '' : 'md:px-3'} py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0 whitespace-nowrap`}>
              <Timer size={14} />
              {!isMobile && (
                <span className="text-xs font-semibold">{t('feed.tab.cooking')}</span>
              )}
              <span className="text-[11px] bg-background/80 data-[state=active]:bg-primary/20 text-muted-foreground data-[state=active]:text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                {cookingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="served" className={`flex-1 gap-1 ${isMobile ? '' : 'md:gap-1.5'} px-2 ${isMobile ? '' : 'md:px-3'} py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0 whitespace-nowrap`}>
              <CheckCircle2 size={14} />
              {!isMobile && (
                <span className="text-xs font-semibold">{t('feed.tab.served')}</span>
              )}
              <span className="text-[11px] bg-background/80 data-[state=active]:bg-primary/20 text-muted-foreground data-[state=active]:text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                {servedOrders.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-32 md:pb-6">
          <TabsContent value="pending" className="m-0 h-full border-none">
            <div className="space-y-8 pt-4">
              {/* CONFIRMED Orders Section */}
              {confirmedOrdersByTable.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <h2 className="text-sm font-semibold text-zinc-900">{t('order.status.confirmed')}</h2>
                  </div>
                  {confirmedOrdersByTable.map(([tableId, tableOrders]) => (
                    <div key={`confirmed-${tableId}`} className="space-y-4">
                      {/* Table Header */}
                      <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center">
                          {tableId}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {t('feed.table_label').replace('{number}', String(tableId))}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {t('feed.order_count').replace('{count}', String(tableOrders.length))}
                          </p>
                        </div>
                      </div>
                      {/* Orders Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {tableOrders.map(order => (
                          <div key={order.id} className="bg-white rounded-xl border border-emerald-200/60 hover:border-emerald-300 hover:shadow-sm transition-all group">
                            {/* Time Badge */}
                            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-emerald-600">{t('feed.minutes_ago').replace('{m}', String(Math.floor((Date.now() - order.timestamp.getTime()) / 60000)))}</span>
                              </div>
                            </div>

                            {/* Menu Items */}
                            <div className="px-4 pb-4 space-y-2.5">
                              {order.items.map((item, idx) => {
                                const menuItem = menu.find(m => m.name === item.name);
                                
                                const getActivePromotionForMenuItem = (menuItemId: string) => {
                                  const now = new Date();
                                  return promotions.find(promo => {
                                    if (!promo.isActive || !promo.discountPercent) return false;
                                    const startDate = new Date(promo.startDate);
                                    const endDate = new Date(promo.endDate);
                                    endDate.setHours(23, 59, 59, 999);
                                    if (now < startDate || now > endDate) return false;
                                    
                                    const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                                                        promo.menuItems?.map(mi => mi.id) || [];
                                    return menuItemIds.includes(menuItemId);
                                  });
                                };

                                const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
                                  if (!discountPercent) return originalPrice;
                                  return Math.floor(originalPrice * (1 - discountPercent / 100));
                                };

                                const menuItemId = item.menuItemId || menuItem?.id;
                                const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                                const originalUnitPrice = item.unitPrice || (item.price / item.quantity);
                                const discountedUnitPrice = activePromotion 
                                  ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                                  : originalUnitPrice;
                                
                                const optionsTotal = item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                  sum + (opt.price * opt.quantity), 0) || 0;
                                const itemTotal = (discountedUnitPrice * item.quantity) + optionsTotal;
                                
                                return (
                                  <div key={idx} className="flex items-start gap-2.5">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                      {menuItem?.imageUrl ? (
                                        <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <UtensilsCrossed size={14} className="text-zinc-300" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-zinc-900 leading-snug">{item.name}</span>
                                        <span className="text-xs font-bold text-zinc-600 shrink-0">{formatPriceVND(itemTotal)}</span>
                                      </div>
                                      <div className="text-xs text-zinc-500 mt-0.5">
                                        {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                          <span className="flex items-center gap-1">
                                            <span className="line-through opacity-60">
                                              {formatPriceVND(originalUnitPrice)}
                                            </span>
                                            <span>
                                              {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                            </span>
                                          </span>
                                        ) : (
                                          <span>
                                            {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                          </span>
                                        )}
                                      </div>
                                      {item.options && item.options.length > 0 && (
                                        <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-zinc-200">
                                          {item.options.map((opt: { name: string; quantity: number; price: number }, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                              <span className="text-zinc-500">
                                                + {opt.name} {opt.quantity > 1 ? `× ${opt.quantity}` : ''}
                                              </span>
                                              <span className="text-zinc-500">
                                                {formatPriceVND(opt.price * opt.quantity)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action Button */}
                            <div className="px-4 pb-4">
                              <button 
                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                disabled={updatingOrderId === order.id}
                                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChefHat size={16} />
                                {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.start_cooking')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PENDING Orders Section */}
              {pendingOrdersByTable.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
                    <ChefHat size={16} className="text-orange-500" />
                    <h2 className="text-sm font-semibold text-zinc-900">{t('feed.tab.new_orders')}</h2>
                  </div>
                  {pendingOrdersByTable.map(([tableId, tableOrders]) => (
                  <div key={tableId} className="space-y-4">
                    {/* Table Header - Minimal */}
                    <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-semibold text-sm flex items-center justify-center">
                        {tableId}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {t('feed.table_label').replace('{number}', String(tableId))}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {t('feed.order_count').replace('{count}', String(tableOrders.length))}
                        </p>
                      </div>
                    </div>
                    {/* Orders Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {tableOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-xl border border-zinc-200/60 hover:border-zinc-300 hover:shadow-sm transition-all group">
                          {/* Time Badge */}
                          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                              <Clock size={12} className="text-orange-500" />
                              <span className="text-orange-600">{t('feed.minutes_ago').replace('{m}', String(Math.floor((Date.now() - order.timestamp.getTime()) / 60000)))}</span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="px-4 pb-4 space-y-2.5">
                            {order.items.map((item, idx) => {
                              const menuItem = menu.find(m => m.name === item.name);
                              
                              // 프로모션 할인 계산
                              const getActivePromotionForMenuItem = (menuItemId: string) => {
                                const now = new Date();
                                return promotions.find(promo => {
                                  if (!promo.isActive || !promo.discountPercent) return false;
                                  const startDate = new Date(promo.startDate);
                                  const endDate = new Date(promo.endDate);
                                  endDate.setHours(23, 59, 59, 999);
                                  if (now < startDate || now > endDate) return false;
                                  
                                  const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                                                      promo.menuItems?.map(mi => mi.id) || [];
                                  return menuItemIds.includes(menuItemId);
                                });
                              };

                              const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
                                if (!discountPercent) return originalPrice;
                                return Math.floor(originalPrice * (1 - discountPercent / 100));
                              };

                              const menuItemId = item.menuItemId || menuItem?.id;
                              const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                              const originalUnitPrice = item.unitPrice || (item.price / item.quantity);
                              const discountedUnitPrice = activePromotion 
                                ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                                : originalUnitPrice;
                              
                              const optionsTotal = item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                sum + (opt.price * opt.quantity), 0) || 0;
                              const itemTotal = (discountedUnitPrice * item.quantity) + optionsTotal;
                              
                              return (
                                <div key={idx} className="flex items-start gap-2.5">
                                  <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                    {menuItem?.imageUrl ? (
                                      <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <UtensilsCrossed size={14} className="text-zinc-300" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-zinc-900 leading-snug">{item.name}</span>
                                      <span className="text-xs font-bold text-zinc-600 shrink-0">{formatPriceVND(itemTotal)}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                      {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                        <span className="flex items-center gap-1">
                                          <span className="line-through opacity-60">
                                            {formatPriceVND(originalUnitPrice)}
                                          </span>
                                          <span>
                                            {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                          </span>
                                        </span>
                                      ) : (
                                        <span>
                                          {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                        </span>
                                      )}
                                    </div>
                                    {item.options && item.options.length > 0 && (
                                      <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-zinc-200">
                                        {item.options.map((opt: { name: string; quantity: number; price: number }, i: number) => (
                                          <div key={i} className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-500">
                                              + {opt.name} {opt.quantity > 1 ? `× ${opt.quantity}` : ''}
                                            </span>
                                            <span className="text-zinc-500">
                                              {formatPriceVND(opt.price * opt.quantity)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Action Buttons */}
                          <div className="px-4 pb-4">
                            {order.status === 'pending' ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                                  disabled={updatingOrderId === order.id}
                                  className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckCircle2 size={16} />
                                  {updatingOrderId === order.id ? t('order.status.confirming') : t('order.action.confirm')}
                                </button>
                                <button 
                                  onClick={() => handleRejectOrder(order.id)}
                                  disabled={updatingOrderId === order.id}
                                  className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {updatingOrderId === order.id ? t('order.status.rejecting') : t('order.action.reject')}
                                </button>
                              </div>
                            ) : order.status === 'confirmed' ? (
                              <button 
                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                disabled={updatingOrderId === order.id}
                                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChefHat size={16} />
                                {updatingOrderId === order.id ? t('order.status.updating') : t('order.action.start_cooking')}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  ))}
                </div>
              ) : null}

              {/* PENDING Orders Section - Empty State */}
              {pendingOrdersByTable.length === 0 && confirmedOrdersByTable.length === 0 && (
                <div className="col-span-full">
                  <EmptyState message={t('feed.empty_new')} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cooking" className="m-0 h-full border-none">
            <div className="space-y-8 pt-4">
              {cookingOrdersByTable.length > 0 ? (
                cookingOrdersByTable.map(([tableId, tableOrders]) => (
                  <div key={tableId} className="space-y-4">
                    {/* Table Header - Minimal */}
                    <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 text-white font-semibold text-sm flex items-center justify-center">
                        {tableId}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {t('feed.table_label').replace('{number}', String(tableId))}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {t('feed.order_count').replace('{count}', String(tableOrders.length))}
                        </p>
                      </div>
                    </div>
                    {/* Orders Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {tableOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-xl border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all group">
                          {/* Time Badge */}
                          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                              <Timer size={12} className="text-blue-500" />
                              <span className="text-blue-600">{t('feed.minutes_elapsed').replace('{m}', String(Math.floor((Date.now() - order.timestamp.getTime()) / 60000)))}</span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="px-4 pb-4 space-y-2.5">
                            {order.items.map((item, idx) => {
                              const menuItem = menu.find(m => m.name === item.name);
                              
                              // 프로모션 할인 계산
                              const getActivePromotionForMenuItem = (menuItemId: string) => {
                                const now = new Date();
                                return promotions.find(promo => {
                                  if (!promo.isActive || !promo.discountPercent) return false;
                                  const startDate = new Date(promo.startDate);
                                  const endDate = new Date(promo.endDate);
                                  endDate.setHours(23, 59, 59, 999);
                                  if (now < startDate || now > endDate) return false;
                                  
                                  const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                                                      promo.menuItems?.map(mi => mi.id) || [];
                                  return menuItemIds.includes(menuItemId);
                                });
                              };

                              const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
                                if (!discountPercent) return originalPrice;
                                return Math.floor(originalPrice * (1 - discountPercent / 100));
                              };

                              const menuItemId = item.menuItemId || menuItem?.id;
                              const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                              const originalUnitPrice = item.unitPrice || (item.price / item.quantity);
                              const discountedUnitPrice = activePromotion 
                                ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                                : originalUnitPrice;
                              
                              const optionsTotal = item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                sum + (opt.price * opt.quantity), 0) || 0;
                              const itemTotal = (discountedUnitPrice * item.quantity) + optionsTotal;
                              
                              return (
                                <div key={idx} className="flex items-start gap-2.5">
                                  <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                    {menuItem?.imageUrl ? (
                                      <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <UtensilsCrossed size={14} className="text-zinc-300" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-zinc-700 leading-snug">{item.name}</span>
                                      <span className="text-xs font-bold text-zinc-600 shrink-0">
                                        {formatPriceVND(itemTotal)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                      {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                        <span className="flex items-center gap-1">
                                          <span className="line-through opacity-60">
                                            {formatPriceVND(originalUnitPrice)}
                                          </span>
                                          <span>
                                            {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                          </span>
                                        </span>
                                      ) : (
                                        <span>
                                          {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                        </span>
                                      )}
                                    </div>
                                    {item.options && item.options.length > 0 && (
                                      <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-zinc-200">
                                        {item.options.map((opt: { name: string; quantity: number; price: number }, i: number) => (
                                          <div key={i} className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-500">
                                              + {opt.name} {opt.quantity > 1 ? `× ${opt.quantity}` : ''}
                                            </span>
                                            <span className="text-zinc-500">
                                              {formatPriceVND(opt.price * opt.quantity)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Action Button: 조리완료 → 다음 탭(조리완료)으로 */}
                          <div className="px-4 pb-4">
                            <button 
                              onClick={() => handleUpdateStatus(order.id, 'served')}
                              disabled={updatingOrderId === order.id}
                              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CircleCheck size={16} />
                              {updatingOrderId === order.id ? t('order.status.updating') : t('feed.tab.served')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState message={t('feed.empty_cooking')} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="served" className="m-0 h-full border-none">
            <div className="space-y-8 pt-4">
              {servedOrdersByTable.length > 0 ? (
                servedOrdersByTable.map(([tableId, tableOrders]) => (
                  <div key={tableId} className="space-y-4">
                    {/* Table Header - Minimal */}
                    <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center">
                        {tableId}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {t('feed.table_label').replace('{number}', String(tableId))}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {t('feed.orders_ready_to_serve').replace('{count}', String(tableOrders.length))}
                        </p>
                      </div>
                    </div>
                    {/* Orders Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {tableOrders.map(order => {
                        // Calculate waiting time since served (in minutes)
                        const waitingMinutes = Math.floor((Date.now() - order.timestamp.getTime()) / 60000);
                        return (
                          <div key={order.id} className="bg-white rounded-xl border border-emerald-200/60 hover:border-emerald-300 hover:shadow-sm transition-all group">
                            {/* Time Badge */}
                            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className={`font-semibold ${waitingMinutes > 10 ? 'text-red-600' : waitingMinutes > 5 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                  {t('feed.minutes_waiting').replace('{m}', String(waitingMinutes))}
                                </span>
                              </div>
                            </div>

                            {/* Menu Items */}
                            <div className="px-4 pb-4 space-y-2.5">
                              {order.items.map((item, idx) => {
                                const menuItem = menu.find(m => m.name === item.name);
                                
                                // 프로모션 할인 계산
                                const getActivePromotionForMenuItem = (menuItemId: string) => {
                                  const now = new Date();
                                  return promotions.find(promo => {
                                    if (!promo.isActive || !promo.discountPercent) return false;
                                    const startDate = new Date(promo.startDate);
                                    const endDate = new Date(promo.endDate);
                                    endDate.setHours(23, 59, 59, 999);
                                    if (now < startDate || now > endDate) return false;
                                    
                                    const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                                                        promo.menuItems?.map(mi => mi.id) || [];
                                    return menuItemIds.includes(menuItemId);
                                  });
                                };

                                const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
                                  if (!discountPercent) return originalPrice;
                                  return Math.floor(originalPrice * (1 - discountPercent / 100));
                                };

                                const menuItemId = item.menuItemId || menuItem?.id;
                                const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                                const originalUnitPrice = item.unitPrice || (item.price / item.quantity);
                                const discountedUnitPrice = activePromotion 
                                  ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                                  : originalUnitPrice;
                                
                                const optionsTotal = item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                  sum + (opt.price * opt.quantity), 0) || 0;
                                const itemTotal = (discountedUnitPrice * item.quantity) + optionsTotal;
                                
                                return (
                                  <div key={idx} className="flex items-start gap-2.5">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                      {menuItem?.imageUrl ? (
                                        <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <UtensilsCrossed size={14} className="text-zinc-300" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-zinc-700 leading-snug">{item.name}</span>
                                        <span className="text-xs font-bold text-zinc-600 shrink-0">
                                          {formatPriceVND(itemTotal)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-zinc-500 mt-0.5">
                                        {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                          <span className="flex items-center gap-1">
                                            <span className="line-through opacity-60">
                                              {formatPriceVND(originalUnitPrice)}
                                            </span>
                                            <span>
                                              {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                            </span>
                                          </span>
                                        ) : (
                                          <span>
                                            {formatPriceVND(discountedUnitPrice)} × {item.quantity}
                                          </span>
                                        )}
                                      </div>
                                      {item.options && item.options.length > 0 && (
                                        <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-zinc-200">
                                          {item.options.map((opt: { name: string; quantity: number; price: number }, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                              <span className="text-zinc-500">
                                                + {opt.name} {opt.quantity > 1 ? `× ${opt.quantity}` : ''}
                                              </span>
                                              <span className="text-zinc-500">
                                                {formatPriceVND(opt.price * opt.quantity)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* 조리완료 상태 배지 + 서빙완료 버튼 */}
                            <div className="px-4 pb-4 space-y-2">
                              <div className="w-full h-9 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-emerald-200">
                                <CheckCircle2 size={14} />
                                {t('feed.tab.served')}
                              </div>
                              <button 
                                onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                disabled={updatingOrderId === order.id}
                                className="w-full h-10 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <UtensilsCrossed size={16} />
                                {updatingOrderId === order.id ? t('order.status.updating') : t('btn.serve')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState message={t('feed.empty_served')} />
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}