import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { MenuItem, CartItem, MenuOption } from '../../types';
import { MenuCategory } from '../../../lib/api';
import { CurrencyDisplay } from '../CurrencyDisplay';
import { X, Plus, Minus, ShoppingBag, Check, Trash2, ArrowLeft, ChevronUp, UtensilsCrossed } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

type LangType = 'ko' | 'vn' | 'en';

const UI_TEXT = {
  cartEmpty: { ko: '장바구니가 비었습니다.', vn: 'Giỏ hàng trống.', en: 'Cart is empty.' },
  menu: { ko: '메뉴', vn: 'Thực đơn', en: 'Menu' },
  cartCheck: { ko: '장바구니 확인', vn: 'Xem giỏ hàng', en: 'View Cart' },
  addMore: { ko: '더 담기', vn: 'Thêm món', en: 'Add More' },
  order: { ko: '주문하기', vn: 'Đặt hàng', en: 'Place Order' },
  total: { ko: '총 결제금액', vn: 'Tổng tiền', en: 'Total Amount' },
  fold: { ko: '접기', vn: 'Thu gọn', en: 'Collapse' },
  selectOption: { ko: '옵션 선택', vn: 'Chọn tùy chọn', en: 'Options' },
  addToCart: { ko: '담기', vn: 'Thêm', en: 'Add' },
  addToCartBtn: { ko: '장바구니 담기', vn: 'Thêm vào giỏ', en: 'Add to Cart' },
  free: { ko: '무료', vn: 'Miễn phí', en: 'Free' },
  all: { ko: '전체', vn: 'Tất cả', en: 'All' },
  food: { ko: '음식', vn: 'Món ăn', en: 'Food' },
  drink: { ko: '음료', vn: 'Đồ uống', en: 'Drinks' },
  dessert: { ko: '디저트', vn: 'Tráng miệng', en: 'Dessert' },
  loadingMenu: { ko: '메뉴를 불러오는 중...', vn: 'Đang tải thực đơn...', en: 'Loading menu...' },
  menuEmpty: { ko: '메뉴가 없습니다.', vn: 'Không có thực đơn.', en: 'No menu available.' }
};

const MenuItemCard: React.FC<{
  item: MenuItem;
  cart: CartItem[];
  addToCart: (item: MenuItem, options?: MenuOption[]) => void;
  removeFromCart: (itemId: string) => void;
  lang: LangType;
}> = ({ item, cart, addToCart, removeFromCart, lang }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([]);
  
  // Calculate quantity of this item in cart (sum of all variations)
  const quantity = cart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
  const hasOptions = item.options && item.options.length > 0;

  const toggleOption = (option: MenuOption) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      if (exists) return prev.filter(o => o.id !== option.id);
      return [...prev, option];
    });
  };

  const handleAddWithOptions = () => {
    addToCart(item, selectedOptions);
    setIsExpanded(false);
    setSelectedOptions([]); // Reset
  };

  const currentPrice = item.priceVND + selectedOptions.reduce((sum, opt) => sum + opt.priceVND, 0);

  // Localization Logic
  const primaryName = lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
  const secondaryName = lang === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
  const description = lang === 'ko' ? item.descriptionKO : lang === 'vn' ? item.descriptionVN : (item.descriptionEN || item.descriptionKO);

  return (
    <div className={`bg-card rounded-2xl overflow-hidden border transition-all duration-200 hover:border-border/70 ${isExpanded ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border/60'} shadow-[0_1px_4px_rgba(0,0,0,0.04)]`}>
      {/* 이미지 영역 */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <img 
          src={item.imageQuery} 
          alt={primaryName}
          className="w-full h-full object-cover"
        />
        
        {/* 수량 배지 */}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            {quantity}
          </div>
        )}
      </div>
      
      {/* 메뉴명 및 설명 영역 */}
      <div className="px-3 pt-3">
        <h3 className="font-semibold text-foreground text-sm leading-snug">
          {primaryName}
        </h3>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>
      
      {/* 금액 및 담기 버튼 영역 - 한 줄 배치 */}
      <div className="px-3 pb-3 pt-2">
        {hasOptions ? (
          <Button 
            onClick={() => setIsExpanded(!isExpanded)}
            variant={isExpanded ? "secondary" : "default"}
            size="sm"
            className={`w-full h-8 text-xs font-semibold rounded-lg transition-all ${
              isExpanded 
                ? 'bg-primary/10 text-primary border border-primary/30' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
            }`}
          >
            {isExpanded ? UI_TEXT.fold[lang] : UI_TEXT.selectOption[lang]}
          </Button>
        ) : (
          quantity > 0 ? (
            <div className="flex items-center gap-2.5">
              <CurrencyDisplay amountVND={item.priceVND} className="text-xs font-bold text-foreground flex-1" />
              <div className="flex items-center gap-0.5 bg-muted rounded-lg px-1 py-0.5 border border-border">
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-90 transition-all"
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-foreground min-w-[20px] text-center">{quantity}</span>
                <button 
                  onClick={() => addToCart(item)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90 transition-all"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CurrencyDisplay amountVND={item.priceVND} className="text-xs font-bold text-foreground flex-1" />
              <button 
                onClick={() => addToCart(item)}
                className="h-7 w-7 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm active:scale-95 transition-all"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {isExpanded && hasOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-dashed border-border space-y-3">
              <div className="space-y-2">
                {item.options?.map(opt => {
                  const isSelected = selectedOptions.some(o => o.id === opt.id);
                  const optLabel = lang === 'ko' ? opt.labelKO : lang === 'vn' ? opt.labelVN : (opt.labelEN || opt.labelKO);
                  const optSub = lang === 'vn' ? (opt.labelEN || opt.labelKO) : opt.labelVN;

                  return (
                    <div 
                      key={opt.id} 
                      onClick={() => toggleOption(opt)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.99] ${
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/20' 
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-border bg-card'
                        }`}>
                          {isSelected && <Check size={10} className="text-white stroke-[4]" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                            {optLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">{optSub}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${opt.priceVND > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {opt.priceVND > 0 ? `+${opt.priceVND.toLocaleString()}` : UI_TEXT.free[lang]}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <Button 
                onClick={handleAddWithOptions}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-black/10 font-medium flex items-center justify-center gap-2"
              >
                <span>{UI_TEXT.addToCartBtn[lang]}</span>
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
                  {currentPrice.toLocaleString()} ₫
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceOrder: (items: CartItem[]) => void;
  defaultShowCart?: boolean;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  lang: LangType;
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  isLoadingMenu?: boolean;
}

export const MenuModal: React.FC<MenuModalProps> = ({ 
  isOpen, 
  onClose, 
  onPlaceOrder, 
  defaultShowCart = false, 
  cart, 
  setCart,
  lang,
  menuItems,
  menuCategories,
  isLoadingMenu = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCartDetails, setShowCartDetails] = useState(defaultShowCart);
  
  // Drag controls for swipe-to-dismiss
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      setShowCartDetails(defaultShowCart);
    }
  }, [isOpen, defaultShowCart]);

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      newCart[index] = { ...item, quantity: newQty };
      return newCart;
    });
  };

  const addToCart = (item: MenuItem, selectedOptions: MenuOption[] = []) => {
    setCart(prev => {
      const optionsKey = (opts?: MenuOption[]) => 
        (opts || []).map(o => o.id).sort().join(',');
      
      const newKey = optionsKey(selectedOptions);

      const existing = prev.find(i => 
        i.id === item.id && 
        optionsKey(i.selectedOptions) === newKey
      );

      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedOptions }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId && (!i.selectedOptions || i.selectedOptions.length === 0));
      if (existing && existing.quantity > 1) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity - 1 } : i);
      }
      if (existing) {
        return prev.filter(i => i !== existing);
      }
      return prev;
    });
  };

  const cartTotal = cart.reduce((sum, item) => {
    const itemPrice = item.priceVND + (item.selectedOptions?.reduce((s, o) => s + o.priceVND, 0) || 0);
    return sum + (itemPrice * item.quantity);
  }, 0);

  const handleOrder = () => {
    if (cart.length > 0) {
      onPlaceOrder(cart);
      setCart([]);
      onClose();
    }
  };

  // API에서 받은 카테고리를 사용하여 필터링
  // activeCategory가 'all'이면 모든 아이템 표시, 아니면 해당 카테고리 ID와 일치하는 아이템만 표시
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => {
        // 카테고리 ID로 직접 매칭
        return item.categoryId === activeCategory;
      });

  // 'all' 카테고리를 첫 번째로 추가하고, API에서 받은 카테고리들을 추가
  // displayOrder로 정렬
  const categories = [
    { id: 'all', label: UI_TEXT.all[lang] },
    ...menuCategories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(cat => ({
        id: cat.id,
        label: lang === 'ko' ? cat.nameKo : lang === 'vn' ? cat.nameVn : (cat.nameEn || cat.nameKo)
      }))
  ];

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
            {/* Header - Draggable */}
            <div 
              className="relative flex items-center justify-between p-4 pt-5 border-b border-border bg-card cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full" />

              <div className="flex items-center gap-2">
                {showCartDetails && (
                  <button onClick={(e) => { e.stopPropagation(); setShowCartDetails(false); }} className="p-1 -ml-1 rounded-full hover:bg-muted">
                    <ArrowLeft size={24} />
                  </button>
                )}
                <h2 className="text-xl font-bold text-foreground">
                  {showCartDetails ? UI_TEXT.cartCheck[lang] : UI_TEXT.menu[lang]}
                </h2>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted">
                <X size={24} />
              </button>
            </div>

          {/* Category Tabs */}
          {!showCartDetails && categories.length > 1 && (
            <div className="bg-muted/50 border-b border-border">
              <div className="flex overflow-x-auto gap-2 p-2 no-scrollbar px-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCategory === cat.id 
                        ? 'bg-primary text-primary-foreground shadow-md transform scale-105' 
                        : 'bg-card text-muted-foreground border border-border hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu List */}
          <div className="flex-1 overflow-y-auto p-4 pb-48">
            {showCartDetails ? (
              <div className="space-y-4">
                 {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                      {UI_TEXT.cartEmpty[lang]}
                    </div>
                 ) : (
                    cart.map((item, index) => {
                      const itemName = lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
                      const itemSub = lang === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
                      
                      return (
                        <div key={index} className="bg-card p-3 rounded-xl border border-border flex gap-3 shadow-sm">
                          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
                            <img src={item.imageQuery} alt={itemName} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-foreground truncate pr-2 leading-tight">{itemName}</h4>
                                <p className="text-xs text-muted-foreground truncate">{itemSub}</p>
                              </div>
                              <button onClick={() => updateQuantity(index, -item.quantity)} className="text-muted-foreground hover:text-destructive p-1 -mr-1">
                                <Trash2 size={18} />
                              </button>
                            </div>
                            
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                └ {item.selectedOptions.map(o => lang === 'ko' ? o.labelKO : lang === 'vn' ? o.labelVN : (o.labelEN || o.labelKO)).join(', ')}
                              </div>
                            )}

                            <div className="flex justify-between items-end mt-2">
                              <CurrencyDisplay amountVND={(item.priceVND + (item.selectedOptions?.reduce((s,o)=>s+o.priceVND,0)||0)) * item.quantity} />
                              
                              <div className="flex items-center gap-3 bg-muted rounded-lg p-1 border border-border">
                                <button onClick={() => updateQuantity(index, -1)} className="w-6 h-6 flex items-center justify-center bg-card rounded shadow-sm border border-border text-muted-foreground active:bg-muted">
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(index, 1)} className="w-6 h-6 flex items-center justify-center bg-card rounded shadow-sm border border-border text-primary active:bg-primary/10">
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                 )}
              </div>
            ) : (
              isLoadingMenu ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground text-sm">{UI_TEXT.loadingMenu[lang]}</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <UtensilsCrossed size={48} className="text-muted-foreground/60" />
                  <p className="text-muted-foreground text-base font-medium">{UI_TEXT.menuEmpty[lang]}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map(item => (
                    <MenuItemCard 
                      key={item.id} 
                      item={item} 
                      cart={cart} 
                      addToCart={addToCart} 
                      removeFromCart={removeFromCart} 
                      lang={lang}
                    />
                  ))}
                </div>
              )
            )}
          </div>

          {/* Cart Bar */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/90 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe z-50">
              {!showCartDetails ? (
                  <div 
                    className="group flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 bg-primary text-primary-foreground p-4 rounded-2xl shadow-xl shadow-black/10 hover:shadow-2xl hover:bg-primary/90"
                    onClick={() => setShowCartDetails(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-foreground text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </div>
                      <span className="font-semibold text-[15px]">
                        {UI_TEXT.cartCheck[lang]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyDisplay amountVND={cartTotal} className="text-primary-foreground font-bold text-lg" />
                      <ChevronUp size={20} className="text-primary-foreground/70 group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
                   <div className="flex items-center justify-between px-1">
                     <span className="text-muted-foreground font-medium">{UI_TEXT.total[lang]}</span>
                     <CurrencyDisplay amountVND={cartTotal} className="text-2xl font-bold text-foreground" />
                   </div>
                   <div className="flex gap-3 h-14">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-full text-muted-foreground border-border hover:bg-muted text-base font-medium rounded-xl hover:text-foreground gap-2"
                        onClick={() => setShowCartDetails(false)}
                      >
                        <Plus size={18} />
                        {UI_TEXT.addMore[lang]}
                      </Button>
                      <Button 
                        onClick={handleOrder}
                        className="flex-[2] h-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold rounded-xl shadow-lg shadow-black/10 gap-2"
                      >
                        {UI_TEXT.order[lang]}
                        <Check size={20} />
                      </Button>
                   </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};