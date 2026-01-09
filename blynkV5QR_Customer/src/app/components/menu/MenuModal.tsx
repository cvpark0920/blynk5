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
    <div className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-200 ${isExpanded ? 'border-blue-200 ring-1 ring-blue-50' : 'border-gray-100'}`}>
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
          <img 
            src={item.imageQuery} 
            alt={primaryName}
            className="w-full h-full object-cover"
          />
          {quantity > 0 && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg">
              {quantity}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 leading-tight mb-0.5">{primaryName}</h3>
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{description || secondaryName}</p>
            <CurrencyDisplay amountVND={item.priceVND} />
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-2">
            {hasOptions ? (
              <Button 
                onClick={() => setIsExpanded(!isExpanded)}
                variant={isExpanded ? "secondary" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  isExpanded 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {isExpanded ? UI_TEXT.fold[lang] : UI_TEXT.selectOption[lang]}
              </Button>
            ) : (
              quantity > 0 ? (
                <>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-medium w-4 text-center text-sm">{quantity}</span>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white active:scale-90 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => addToCart(item)}
                  className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold active:scale-95 transition-transform"
                >
                  {UI_TEXT.addToCart[lang]}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-3">
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
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check size={10} className="text-white stroke-[4]" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                            {optLabel}
                          </span>
                          <span className="text-[10px] text-gray-400 leading-none">{optSub}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${opt.priceVND > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {opt.priceVND > 0 ? `+${opt.priceVND.toLocaleString()}` : UI_TEXT.free[lang]}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <Button 
                onClick={handleAddWithOptions}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 font-medium flex items-center justify-center gap-2"
              >
                <span>{UI_TEXT.addToCartBtn[lang]}</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
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
        // menuItems의 category는 'food'|'drink'|'dessert' 형식이지만
        // 실제로는 카테고리 ID로 매핑해야 함
        // 현재는 카테고리 이름 기반으로 매핑되어 있으므로, 
        // 카테고리 ID를 찾아서 해당 카테고리의 메뉴 아이템만 필터링
        const category = menuCategories.find(cat => cat.id === activeCategory);
        if (!category) return false;
        
        // 카테고리 이름 기반으로 매칭 (기존 로직 유지)
        const categoryName = category.nameKo.toLowerCase().includes('음식') || category.nameKo.toLowerCase().includes('food') 
          ? 'food' 
          : category.nameKo.toLowerCase().includes('음료') || category.nameKo.toLowerCase().includes('drink')
          ? 'drink'
          : 'dessert';
        
        return item.category === categoryName;
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
            className="fixed inset-x-0 bottom-0 z-50 bg-white flex flex-col h-[85%] rounded-t-2xl shadow-2xl overflow-hidden"
          >
            {/* Header - Draggable */}
            <div 
              className="relative flex items-center justify-between p-4 pt-5 border-b border-gray-100 bg-white cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />

              <div className="flex items-center gap-2">
                {showCartDetails && (
                  <button onClick={(e) => { e.stopPropagation(); setShowCartDetails(false); }} className="p-1 -ml-1 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} />
                  </button>
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  {showCartDetails ? UI_TEXT.cartCheck[lang] : UI_TEXT.menu[lang]}
                </h2>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>

          {/* Category Tabs */}
          {!showCartDetails && categories.length > 1 && (
            <div className="bg-gray-50 border-b border-gray-100">
              <div className="flex overflow-x-auto gap-2 p-2 no-scrollbar px-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCategory === cat.id 
                        ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48">
            {showCartDetails ? (
              <div className="space-y-4">
                 {cart.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                      {UI_TEXT.cartEmpty[lang]}
                    </div>
                 ) : (
                    cart.map((item, index) => {
                      const itemName = lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
                      const itemSub = lang === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
                      
                      return (
                        <div key={index} className="bg-white p-3 rounded-xl border border-gray-100 flex gap-3 shadow-sm">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                            <img src={item.imageQuery} alt={itemName} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-gray-900 truncate pr-2 leading-tight">{itemName}</h4>
                                <p className="text-xs text-gray-500 truncate">{itemSub}</p>
                              </div>
                              <button onClick={() => updateQuantity(index, -item.quantity)} className="text-gray-400 hover:text-red-500 p-1 -mr-1">
                                <Trash2 size={18} />
                              </button>
                            </div>
                            
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="text-[10px] text-gray-600 mt-1 leading-tight">
                                └ {item.selectedOptions.map(o => lang === 'ko' ? o.labelKO : lang === 'vn' ? o.labelVN : (o.labelEN || o.labelKO)).join(', ')}
                              </div>
                            )}

                            <div className="flex justify-between items-end mt-2">
                              <CurrencyDisplay amountVND={(item.priceVND + (item.selectedOptions?.reduce((s,o)=>s+o.priceVND,0)||0)) * item.quantity} />
                              
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                <button onClick={() => updateQuantity(index, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-gray-100 text-gray-600 active:bg-gray-100">
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(index, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-gray-100 text-blue-600 active:bg-blue-50">
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
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-sm">{UI_TEXT.loadingMenu[lang]}</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <UtensilsCrossed size={48} className="text-gray-300" />
                  <p className="text-gray-500 text-base font-medium">{UI_TEXT.menuEmpty[lang]}</p>
                </div>
              ) : (
                filteredItems.map(item => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    cart={cart} 
                    addToCart={addToCart} 
                    removeFromCart={removeFromCart} 
                    lang={lang}
                  />
                ))
              )
            )}
          </div>

          {/* Cart Bar */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe z-50">
              {!showCartDetails ? (
                  <div 
                    className="group flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 bg-[#1a1a1a] text-white p-4 rounded-2xl shadow-xl shadow-gray-200 hover:shadow-2xl hover:bg-black"
                    onClick={() => setShowCartDetails(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white text-gray-900 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </div>
                      <span className="font-semibold text-[15px]">
                        {UI_TEXT.cartCheck[lang]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyDisplay amountVND={cartTotal} className="text-white font-bold text-lg" />
                      <ChevronUp size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
                   <div className="flex items-center justify-between px-1">
                     <span className="text-gray-500 font-medium">{UI_TEXT.total[lang]}</span>
                     <CurrencyDisplay amountVND={cartTotal} className="text-2xl font-bold text-gray-900" />
                   </div>
                   <div className="flex gap-3 h-14">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-full text-gray-600 border-gray-200 hover:bg-gray-50 text-base font-medium rounded-xl hover:text-gray-900 gap-2"
                        onClick={() => setShowCartDetails(false)}
                      >
                        <Plus size={18} />
                        {UI_TEXT.addMore[lang]}
                      </Button>
                      <Button 
                        onClick={handleOrder}
                        className="flex-[2] h-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-200 gap-2"
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