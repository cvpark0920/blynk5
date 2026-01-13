import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { mapBackendCategoryToFrontend, mapBackendMenuItemToFrontend } from '../../utils/mappers';
import { BackendMenuCategory, BackendMenuItem } from '../../types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Image as ImageIcon, Plus, Minus, X, ShoppingCart } from 'lucide-react';
import { cn } from '../ui/utils';
import { formatPriceVND } from '../../utils/priceFormat';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: Array<{
    optionId: string;
    quantity: number;
  }>;
  notes?: string[];
}

interface OrderEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string; // UUID
  tableNumber: number;
  restaurantId: string;
  guestCount?: number;
  onOrderCreated?: (orderData?: any) => void | Promise<void>;
}

// Simple hook for responsive design
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

// Menu Item Image Component with error handling
function MenuItemImage({ imageUrl, name }: { imageUrl: string | null | undefined; name: string }) {
  const [imageError, setImageError] = useState(false);
  
  if (!imageUrl || imageUrl.trim() === '' || imageError) {
    return <ImageIcon size={24} className="text-zinc-300" />;
  }
  
  return (
    <img 
      src={imageUrl} 
      alt={name} 
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}

export function OrderEntrySheet({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  restaurantId,
  guestCount = 1,
  onOrderCreated,
}: OrderEntrySheetProps) {
  const { t, language } = useLanguage();
  const isDesktop = useIsDesktop();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Load menu and categories
  useEffect(() => {
    if (isOpen && restaurantId) {
      loadMenu();
    }
  }, [isOpen, restaurantId, language]);

  // Reset cart when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setCart([]);
      setSelectedCategoryId(null);
    }
  }, [isOpen]);

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getMenu(restaurantId);
      if (result.success && result.data) {
        const loadedCategories: MenuCategory[] = [];
        const loadedMenu: MenuItem[] = [];
        
        result.data.forEach((category: BackendMenuCategory) => {
          loadedCategories.push(mapBackendCategoryToFrontend(category, language));
          
          (category.menuItems || []).forEach((item: BackendMenuItem) => {
            const mappedItem = mapBackendMenuItemToFrontend(item, language);
            loadedMenu.push(mappedItem);
          });
        });
        
        setCategories(loadedCategories);
        setMenu(loadedMenu);
        
        // Select first category if available
        if (loadedCategories.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(loadedCategories[0].id);
        }
      }
    } catch (error: unknown) {
      console.error('Error loading menu:', error);
      toast.error('메뉴를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (menuItem: MenuItem) => {
    if (menuItem.isSoldOut) {
      toast.error('품절된 메뉴입니다.');
      return;
    }

    // For now, add without options (can be enhanced later)
    const existingItemIndex = cart.findIndex(
      item => item.menuItem.id === menuItem.id &&
      JSON.stringify(item.selectedOptions) === JSON.stringify([])
    );

    if (existingItemIndex >= 0) {
      // Increase quantity
      setCart(prev => prev.map((item, idx) =>
        idx === existingItemIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setCart(prev => [...prev, {
        menuItem,
        quantity: 1,
        selectedOptions: [],
        notes: [],
      }]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => prev.map((item, idx) => {
      if (idx === index) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      let itemTotal = item.menuItem.price * item.quantity;
      // Add option prices
      item.selectedOptions.forEach(opt => {
        const option = item.menuItem.optionGroups
          .flatMap(og => og.options)
          .find(o => o.id === opt.optionId);
        if (option) {
          itemTotal += option.price * opt.quantity * item.quantity;
        }
      });
      return total + itemTotal;
    }, 0);
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    setIsCreatingOrder(true);
    try {
      // 1. Create or get session
      const sessionResult = await apiClient.createSession(restaurantId, tableId, guestCount);
      if (!sessionResult.success || !sessionResult.data) {
        throw new Error('Session 생성에 실패했습니다.');
      }
      const sessionId = sessionResult.data.id;

      // 2. Convert cart items to order items
      const orderItems = cart.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        options: item.selectedOptions,
        notes: item.notes || [],
      }));

      // 3. Create order
      const orderResult = await apiClient.createOrder(sessionId, tableId, restaurantId, orderItems);
      if (!orderResult.success || !orderResult.data) {
        throw new Error(orderResult.error?.message || '주문 생성에 실패했습니다.');
      }

      // Don't show toast here - SSE event will trigger toast notification
      // This prevents duplicate toast messages (order creation + SSE event)
      
      // Call callback with order data
      onOrderCreated?.(orderResult.data);
      onClose();
    } catch (error: unknown) {
      console.error('Error creating order:', error);
      const errorMessage = error instanceof Error ? error.message : '주문 생성에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const filteredMenu = selectedCategoryId
    ? menu.filter(item => item.categoryId === selectedCategoryId)
    : menu;

  const totalAmount = calculateTotal();

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100">
        <h2 className="text-xl font-bold text-zinc-900">
          {t('order.entry.title')} - {t('order.entry.table_number').replace('{number}', tableNumber.toString())}
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          {guestCount}명
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-400">메뉴를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* Categories */}
            {categories.length > 0 && (
              <div className="px-6 py-3 border-b border-zinc-100 overflow-x-auto">
                <div className="flex gap-2">
                  {categories.sort((a, b) => a.order - b.order).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                        selectedCategoryId === cat.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Grid */}
            <ScrollArea className="flex-1 px-6 py-4">
              {filteredMenu.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-zinc-400">메뉴가 없습니다.</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredMenu.map(item => (
                    <div
                      key={item.id}
                      onClick={() => !item.isSoldOut && addToCart(item)}
                      className={cn(
                        "bg-white p-3 rounded-xl border border-zinc-100 cursor-pointer transition-all",
                        item.isSoldOut
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-md active:scale-[0.98]"
                      )}
                    >
                      <div className="w-full aspect-square rounded-lg bg-zinc-100 flex items-center justify-center mb-2 overflow-hidden border border-zinc-200">
                        <MenuItemImage imageUrl={item.imageUrl} name={item.name} />
                      </div>
                      <h4 className={cn(
                        "font-bold text-sm text-zinc-900 mb-1 truncate",
                        item.isSoldOut && "line-through text-zinc-400"
                      )}>
                        {item.name}
                      </h4>
                      <p className="text-xs font-medium text-zinc-600 mb-1">
                        {formatPriceVND(item.price)}
                      </p>
                      {item.isSoldOut && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          품절
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-zinc-100 bg-white">
                <div className="px-6 py-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {item.menuItem.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatPriceVND(item.menuItem.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(index, -1)}
                            className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold text-zinc-900 w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(index, 1)}
                            className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">총액</p>
                    <p className="text-xl font-bold text-zinc-900">
                      {formatPriceVND(totalAmount)}
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateOrder}
                    disabled={isCreatingOrder || cart.length === 0}
                    className="gap-2"
                  >
                    <ShoppingCart size={16} />
                    {isCreatingOrder ? t('order.entry.creating') : t('order.entry.create_order')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[600px] h-full rounded-l-[32px] rounded-bl-[32px] sm:max-w-[600px] p-0 bg-white border-none outline-none flex flex-col overflow-hidden">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh] rounded-t-[32px] bg-white p-0">
        {content}
      </DrawerContent>
    </Drawer>
  );
}
