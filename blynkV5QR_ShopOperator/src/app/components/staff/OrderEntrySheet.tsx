import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory, MenuOptionGroup } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { mapBackendCategoryToFrontend, mapBackendMenuItemToFrontend } from '../../utils/mappers';
import { BackendMenuCategory, BackendMenuItem } from '../../types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Image as ImageIcon, Plus, Minus, X, ShoppingCart, Check } from 'lucide-react';
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
    return <ImageIcon size={24} className="text-muted-foreground" />;
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
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<{ optionId: string; quantity: number }>>([]);

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

  // selectedMenuItem이 null이 되면 optionDialogOpen도 false로 설정
  useEffect(() => {
    if (!selectedMenuItem && optionDialogOpen) {
      setOptionDialogOpen(false);
    }
  }, [selectedMenuItem, optionDialogOpen]);

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

  const handleMenuItemClick = (menuItem: MenuItem) => {
    if (menuItem.isSoldOut) {
      toast.error('품절된 메뉴입니다.');
      return;
    }

    // 옵션이 있으면 옵션 선택 다이얼로그 표시
    if (menuItem.optionGroups && menuItem.optionGroups.length > 0) {
      setSelectedMenuItem(menuItem);
      setSelectedOptions([]);
      setOptionDialogOpen(true);
    } else {
      // 옵션이 없으면 바로 장바구니에 추가
      addToCart(menuItem, []);
    }
  };

  const addToCart = (menuItem: MenuItem, options: Array<{ optionId: string; quantity: number }>) => {
    if (menuItem.isSoldOut) {
      toast.error('품절된 메뉴입니다.');
      return;
    }

    // 옵션 키로 기존 아이템 찾기
    const optionsKey = JSON.stringify(options.sort((a, b) => a.optionId.localeCompare(b.optionId)));
    const existingItemIndex = cart.findIndex(
      item => item.menuItem.id === menuItem.id &&
      JSON.stringify(item.selectedOptions.sort((a, b) => a.optionId.localeCompare(b.optionId))) === optionsKey
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
        selectedOptions: options,
        notes: [],
      }]);
    }
  };

  const handleOptionConfirm = () => {
    if (!selectedMenuItem) return;

    // 옵션 그룹별로 최소/최대 선택 개수 검증
    let isValid = true;
    const optionCounts: Record<string, number> = {};

    selectedOptions.forEach(opt => {
      optionCounts[opt.optionId] = (optionCounts[opt.optionId] || 0) + opt.quantity;
    });

    for (const group of selectedMenuItem.optionGroups) {
      const groupSelectedCount = group.options.reduce((sum, opt) => {
        return sum + (optionCounts[opt.id] || 0);
      }, 0);

      if (groupSelectedCount < group.minSelect) {
        toast.error(`${group.name}: 최소 ${group.minSelect}개를 선택해주세요.`);
        isValid = false;
        break;
      }
      if (group.maxSelect > 0 && groupSelectedCount > group.maxSelect) {
        toast.error(`${group.name}: 최대 ${group.maxSelect}개까지 선택 가능합니다.`);
        isValid = false;
        break;
      }
    }

    if (!isValid) return;

    // 장바구니에 추가
    addToCart(selectedMenuItem, selectedOptions);
    setOptionDialogOpen(false);
    setSelectedMenuItem(null);
    setSelectedOptions([]);
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => {
      const existing = prev.find(opt => opt.optionId === optionId);
      if (existing) {
        // 옵션 제거
        return prev.filter(opt => opt.optionId !== optionId);
      } else {
        // 옵션 추가
        return [...prev, { optionId, quantity: 1 }];
      }
    });
  };

  const updateOptionQuantity = (optionId: string, delta: number) => {
    setSelectedOptions(prev => {
      const existing = prev.find(opt => opt.optionId === optionId);
      if (!existing) {
        if (delta > 0) {
          return [...prev, { optionId, quantity: 1 }];
        }
        return prev;
      }
      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(opt => opt.optionId !== optionId);
      }
      return prev.map(opt =>
        opt.optionId === optionId ? { ...opt, quantity: newQuantity } : opt
      );
    });
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

  // 옵션 선택 다이얼로그 렌더링
  const renderOptionDialog = () => {
    // selectedMenuItem이 없으면 Dialog를 렌더링하지 않음
    // 이렇게 하면 DialogContent가 DialogTitle 없이 렌더링되는 것을 방지할 수 있습니다
    if (!selectedMenuItem) return null;

    const calculateTotalPrice = () => {
      let total = selectedMenuItem.price;
      selectedOptions.forEach(opt => {
        const option = selectedMenuItem.optionGroups
          .flatMap(og => og.options)
          .find(o => o.id === opt.optionId);
        if (option) {
          total += option.price * opt.quantity;
        }
      });
      return total;
    };

    const dialogTitle = selectedMenuItem.name || '옵션 선택';

    return (
      <Dialog 
        open={optionDialogOpen && !!selectedMenuItem} 
        onOpenChange={(open) => {
          setOptionDialogOpen(open);
          if (!open) {
            setSelectedMenuItem(null);
            setSelectedOptions([]);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dialogTitle}
            </DialogTitle>
            {selectedMenuItem.price > 0 && (
              <DialogDescription>
                {formatPriceVND(selectedMenuItem.price)}
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 px-1">
            <div className="space-y-6 py-2">
              {selectedMenuItem.optionGroups.map((group: MenuOptionGroup) => {
                const groupSelectedCount = selectedOptions.reduce((sum, opt) => {
                  const option = group.options.find(o => o.id === opt.optionId);
                  return sum + (option ? opt.quantity : 0);
                }, 0);

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-foreground">{group.name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {group.minSelect > 0 && `최소 ${group.minSelect}개`}
                        {group.minSelect > 0 && group.maxSelect > 0 && ' / '}
                        {group.maxSelect > 0 && `최대 ${group.maxSelect}개`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const selected = selectedOptions.find(opt => opt.optionId === option.id);
                        const quantity = selected?.quantity || 0;
                        const isSelected = quantity > 0;

                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-all",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                onClick={() => toggleOption(option.id)}
                                className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-border bg-card"
                                )}
                              >
                                {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium",
                                  isSelected ? "text-foreground" : "text-foreground/80"
                                )}>
                                  {option.name}
                                </p>
                                {option.price > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{formatPriceVND(option.price)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOptionQuantity(option.id, -1);
                                  }}
                                  className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-medium w-5 text-center">{quantity}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOptionQuantity(option.id, 1);
                                  }}
                                  className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs text-muted-foreground">총액</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPriceVND(calculateTotalPrice())}
                </p>
              </div>
              <Button onClick={handleOptionConfirm} className="gap-2">
                <ShoppingCart size={16} />
                추가
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">
          {t('order.entry.title')} - {t('order.entry.table_number').replace('{number}', tableNumber.toString())}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {guestCount}명
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">메뉴를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* Categories */}
            {categories.length > 0 && (
              <div className="px-6 py-3 border-b border-border overflow-x-auto">
                <div className="flex gap-2">
                  {categories.sort((a, b) => a.order - b.order).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                        selectedCategoryId === cat.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
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
                  <div className="text-muted-foreground">메뉴가 없습니다.</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredMenu.map(item => (
                    <div
                      key={item.id}
                      onClick={() => !item.isSoldOut && handleMenuItemClick(item)}
                      className={cn(
                        "bg-card p-3 rounded-xl border border-border cursor-pointer transition-all",
                        item.isSoldOut
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-md active:scale-[0.98]"
                      )}
                    >
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2 overflow-hidden border border-border">
                        <MenuItemImage imageUrl={item.imageUrl} name={item.name} />
                      </div>
                      <h4 className={cn(
                        "font-bold text-sm text-foreground mb-1 truncate",
                        item.isSoldOut && "line-through text-muted-foreground"
                      )}>
                        {item.name}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
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
              <div className="border-t border-border bg-card">
                <div className="px-6 py-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {cart.map((item, index) => {
                      const itemTotalPrice = item.menuItem.price * item.quantity +
                        item.selectedOptions.reduce((sum, opt) => {
                          const option = item.menuItem.optionGroups
                            .flatMap(og => og.options)
                            .find(o => o.id === opt.optionId);
                          return sum + (option ? option.price * opt.quantity * item.quantity : 0);
                        }, 0);

                      return (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.menuItem.name}
                            </p>
                            {item.selectedOptions.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.selectedOptions.map(opt => {
                                  const option = item.menuItem.optionGroups
                                    .flatMap(og => og.options)
                                    .find(o => o.id === opt.optionId);
                                  return option ? `${option.name} x${opt.quantity}` : '';
                                }).filter(Boolean).join(', ')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatPriceVND(itemTotalPrice)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(index, -1)}
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold text-foreground w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(index, 1)}
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/20 text-destructive"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">총액</p>
                    <p className="text-xl font-bold text-foreground">
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
      <>
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="right" className="w-[600px] h-full rounded-l-[32px] rounded-bl-[32px] sm:max-w-[600px] p-0 bg-card border-none outline-none flex flex-col overflow-hidden">
            {content}
          </SheetContent>
        </Sheet>
        {renderOptionDialog()}
      </>
    );
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] rounded-t-[32px] bg-card p-0">
          {content}
        </DrawerContent>
      </Drawer>
      {renderOptionDialog()}
    </>
  );
}
