import React, { useState } from 'react';
import { Order } from '../../data';
import { ChefHat, CircleCheck, Clock, UtensilsCrossed, ArrowRight, Timer, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { formatPriceVND } from '../../utils/priceFormat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface OrderFeedProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrdersReload?: () => void;
}

export function OrderFeed({ orders, setOrders, onOrdersReload, menu = [] }: OrderFeedProps & { menu?: Array<{ id: string; name: string; imageUrl?: string }> }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking'>('pending');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const foodOrders = orders.filter(o => 
    o.type === 'order' && 
    (o.status === 'pending' || o.status === 'cooking')
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const pendingOrders = foodOrders.filter(o => o.status === 'pending');
  const cookingOrders = foodOrders.filter(o => o.status === 'cooking');

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
  const cookingOrdersByTable = groupOrdersByTable(cookingOrders);

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
        
        if (newStatus === 'cooking') {
          toast.success(t('msg.cooking_started') || "Order started cooking");
        } else if (newStatus === 'served') {
          toast.success(t('msg.completed') || "Order served");
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'cooking')} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 shrink-0">
          <TabsList className="bg-muted/60 p-0.5 h-9 w-full gap-1 rounded-lg">
            <TabsTrigger value="pending" className="gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0">
              <ChefHat size={14} />
              <span className="text-xs font-semibold">{t('feed.tab.new_orders')}</span>
              <span className="text-[11px] bg-background/80 data-[state=active]:bg-primary/20 text-muted-foreground data-[state=active]:text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                {pendingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="cooking" className="gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-md border-0">
              <Timer size={14} />
              <span className="text-xs font-semibold">{t('feed.tab.cooking')}</span>
              <span className="text-[11px] bg-background/80 data-[state=active]:bg-primary/20 text-muted-foreground data-[state=active]:text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                {cookingOrders.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-32 md:pb-6">
          <TabsContent value="pending" className="m-0 h-full border-none">
            <div className="space-y-8 pt-4">
              {pendingOrdersByTable.length > 0 ? (
                pendingOrdersByTable.map(([tableId, tableOrders]) => (
                  <div key={tableId} className="space-y-4">
                    {/* Table Header - Minimal */}
                    <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-semibold text-sm flex items-center justify-center">
                        {tableId}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          Table {tableId}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'}
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
                              <span className="text-orange-600">{Math.floor((Date.now() - order.timestamp.getTime()) / 60000)}m ago</span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="px-4 pb-4 space-y-2.5">
                            {order.items.map((item, idx) => {
                              const menuItem = menu.find(m => m.name === item.name);
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
                                      <span className="text-xs font-bold text-zinc-600 shrink-0">{formatPriceVND(item.price)}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                      {formatPriceVND(item.unitPrice || (item.price / item.quantity))} × {item.quantity}
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
                              {updatingOrderId === order.id ? 'Updating...' : 'Start Cooking'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState message="No new orders" />
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
                          Table {tableId}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'} cooking
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
                              <span className="text-blue-600">{Math.floor((Date.now() - order.timestamp.getTime()) / 60000)}m elapsed</span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="px-4 pb-4 space-y-2.5">
                            {order.items.map((item, idx) => {
                              const menuItem = menu.find(m => m.name === item.name);
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
                                        {formatPriceVND(
                                          (item.unitPrice || 0) * item.quantity + 
                                          (item.options?.reduce((sum: number, opt: { name: string; quantity: number; price: number }) => 
                                            sum + (opt.price * opt.quantity), 0) || 0)
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                      {formatPriceVND(item.unitPrice || (item.price / item.quantity))} × {item.quantity}
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
                              onClick={() => handleUpdateStatus(order.id, 'served')}
                              disabled={updatingOrderId === order.id}
                              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CircleCheck size={16} />
                              {updatingOrderId === order.id ? 'Updating...' : 'Mark Served'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState message="Nothing cooking right now" />
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}