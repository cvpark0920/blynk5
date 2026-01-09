import React, { useState } from 'react';
import { Order } from '../../data';
import { ChefHat, CircleCheck, Clock, UtensilsCrossed, ArrowRight, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface OrderFeedProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrdersReload?: () => void;
}

export function OrderFeed({ orders, setOrders, onOrdersReload, menu = [] }: OrderFeedProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking'>('pending');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const foodOrders = orders.filter(o => 
    o.type === 'order' && 
    (o.status === 'pending' || o.status === 'cooking')
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const pendingOrders = foodOrders.filter(o => o.status === 'pending');
  const cookingOrders = foodOrders.filter(o => o.status === 'cooking');

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
    <div className="flex flex-col items-center justify-center py-24 text-zinc-300 min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100/50 flex items-center justify-center mb-4">
            <UtensilsCrossed size={28} className="opacity-30" />
        </div>
        <p className="font-medium text-zinc-400">{message}</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'cooking')} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 shrink-0">
          <TabsList className="bg-zinc-100 p-1 mb-4 w-full md:w-auto grid grid-cols-2 md:inline-flex">
            <TabsTrigger value="pending" className="gap-2 px-6">
              <ChefHat size={16} />
              {t('feed.tab.new_orders')} ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cooking" className="gap-2 px-6">
              <Timer size={16} />
              {t('feed.tab.cooking')} ({cookingOrders.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-32 md:pb-6">
          <TabsContent value="pending" className="m-0 h-full border-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <ChefHat size={80} />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 font-bold text-lg flex items-center justify-center">
                                        {order.tableId}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Table {order.tableId}</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md w-fit">
                                            <Clock size={12} />
                                            {Math.floor((Date.now() - order.timestamp.getTime()) / 60000)}m ago
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-5 relative z-10">
                                {order.items.map((item, idx) => {
                                    const menuItem = menu.find(m => m.name === item.name);
                                    return (
                                        <li key={idx} className="flex justify-between items-start text-sm">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                                    {menuItem?.imageUrl ? (
                                                        <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                            <UtensilsCrossed size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-bold text-zinc-800 text-base leading-tight">{item.name}</span>
                                                    {item.options && item.options.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.options.map((opt, i) => (
                                                                <span key={i} className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                                                                    {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-lg shrink-0 ml-2">×{item.quantity}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <button 
                                onClick={() => handleUpdateStatus(order.id, 'cooking')}
                                disabled={updatingOrderId === order.id}
                                className="w-full h-12 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChefHat size={18} />
                                {updatingOrderId === order.id ? 'Updating...' : 'Start Cooking'}
                            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
              {cookingOrders.length > 0 ? (
                cookingOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <Clock size={80} />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 font-bold text-lg flex items-center justify-center">
                                        {order.tableId}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Cooking</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                                            <Clock size={12} />
                                            {Math.floor((Date.now() - order.timestamp.getTime()) / 60000)}m elapsed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-5 relative z-10">
                                {order.items.map((item, idx) => {
                                    const menuItem = menu.find(m => m.name === item.name);
                                    return (
                                        <li key={idx} className="flex justify-between items-start text-sm">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-100">
                                                    {menuItem?.imageUrl ? (
                                                        <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                            <UtensilsCrossed size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-medium text-zinc-600 text-base leading-tight">{item.name}</span>
                                                    {item.options && item.options.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.options.map((opt, i) => (
                                                                <span key={i} className="text-[10px] font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                                                                    {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-zinc-500 bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-100 shrink-0 ml-2">×{item.quantity}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <button 
                                onClick={() => handleUpdateStatus(order.id, 'served')}
                                disabled={updatingOrderId === order.id}
                                className="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CircleCheck size={18} />
                                {updatingOrderId === order.id ? 'Updating...' : 'Mark Served'}
                            </button>
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