import React, { useState } from 'react';
import { X, ShoppingBag, ShoppingCart, Check } from 'lucide-react';
import { Promotion, MenuItem as BackendMenuItem } from '../../../lib/api';
import type { LangType } from '../../i18n/translations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { CurrencyDisplay } from '../CurrencyDisplay';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { MenuItem as FrontendMenuItem, CartItem, MenuOption } from '../../types';

interface PromotionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onHideToday: () => void;
  promotion: Promotion;
  lang: LangType;
  menuItems?: BackendMenuItem[];
  onMenuClick?: (menuItem: BackendMenuItem) => void;
  cart?: CartItem[];
  setCart?: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onAddToCart?: (item: FrontendMenuItem, options?: MenuOption[]) => void;
}

const UI_TEXT = {
  hideToday: {
    ko: '오늘 하루 안보기',
    vn: 'Ẩn hôm nay',
    en: "Don't show today",
    zh: '今天不再显示',
    ru: 'Не показывать сегодня',
  },
  ok: {
    ko: '확인',
    vn: 'Đồng ý',
    en: 'OK',
    zh: '确定',
    ru: 'ОК',
  },
  discount: {
    ko: '할인',
    vn: 'Giảm giá',
    en: 'Discount',
    zh: '折扣',
    ru: 'Скидка',
  },
  addAllToCart: {
    ko: '전체 담기',
    vn: 'Thêm tất cả',
    en: 'Add All',
    zh: '全部加入',
    ru: 'Добавить все',
  },
  addedToCart: {
    ko: '장바구니에 추가되었습니다',
    vn: 'Đã thêm vào giỏ hàng',
    en: 'Added to cart',
    zh: '已加入购物车',
    ru: 'Добавлено в корзину',
  },
};

export const PromotionPopup: React.FC<PromotionPopupProps> = ({
  isOpen,
  onClose,
  onHideToday,
  promotion,
  lang,
  menuItems = [],
  onMenuClick,
  cart = [],
  setCart,
  onAddToCart,
}) => {
  const [itemsWithOptions, setItemsWithOptions] = useState<FrontendMenuItem[]>([]);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [currentItemForOptions, setCurrentItemForOptions] = useState<FrontendMenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([]);
  const getLocalizedTitle = () => {
    if (lang === 'ko') return promotion.titleKo;
    if (lang === 'vn') return promotion.titleVn;
    if (lang === 'zh') return promotion.titleZh || promotion.titleEn || promotion.titleKo;
    if (lang === 'ru') return (promotion as any).titleRu || promotion.titleEn || promotion.titleKo;
    return promotion.titleEn || promotion.titleKo;
  };

  const getLocalizedDescription = () => {
    if (lang === 'ko') return promotion.descriptionKo;
    if (lang === 'vn') return promotion.descriptionVn;
    if (lang === 'zh') return promotion.descriptionZh || promotion.descriptionEn || promotion.descriptionKo;
    if (lang === 'ru') return (promotion as any).descriptionRu || promotion.descriptionEn || promotion.descriptionKo;
    return promotion.descriptionEn || promotion.descriptionKo;
  };

  const getMenuItemName = (item: BackendMenuItem | FrontendMenuItem) => {
    if ('nameKo' in item) {
      // BackendMenuItem
      if (lang === 'ko') return item.nameKo;
      if (lang === 'vn') return item.nameVn;
      if (lang === 'zh') return item.nameZh || item.nameEn || item.nameKo;
      if (lang === 'ru') return item.nameRu || item.nameEn || item.nameKo;
      return item.nameEn || item.nameKo;
    } else {
      // FrontendMenuItem
      if (lang === 'ko') return item.nameKO;
      if (lang === 'vn') return item.nameVN;
      if (lang === 'zh') return item.nameZH || item.nameEN || item.nameKO;
      if (lang === 'ru') return item.nameRU || item.nameEN || item.nameKO;
      return item.nameEN || item.nameKO;
    }
  };

  // 백엔드 MenuItem을 프론트엔드 MenuItem으로 변환
  const convertBackendMenuItemToFrontend = (backendItem: BackendMenuItem): FrontendMenuItem => {
    const options = (backendItem.optionGroups || []).flatMap(group => 
      (group.options || []).map(opt => ({
        id: opt.id,
        labelKO: opt.nameKo,
        labelVN: opt.nameVn,
        labelEN: opt.nameEn,
        labelZH: opt.nameZh,
        labelRU: opt.nameRu,
        priceVND: opt.priceVnd,
      }))
    );
    
    return {
      id: backendItem.id,
      nameKO: backendItem.nameKo,
      nameVN: backendItem.nameVn,
      nameEN: backendItem.nameEn,
      nameZH: backendItem.nameZh,
      nameRU: backendItem.nameRu,
      priceVND: backendItem.priceVnd,
      category: 'food', // 기본값
      categoryId: backendItem.categoryId || '',
      imageQuery: backendItem.imageUrl || '',
      descriptionKO: backendItem.descriptionKo,
      descriptionVN: backendItem.descriptionVn,
      descriptionEN: backendItem.descriptionEn,
      descriptionZH: backendItem.descriptionZh,
      descriptionRU: backendItem.descriptionRu,
      options: options.length > 0 ? options : undefined,
    };
  };

  // 장바구니에 추가하는 함수
  const addToCart = (item: FrontendMenuItem, selectedOptions: MenuOption[] = []) => {
    if (!setCart) {
      if (onAddToCart) {
        onAddToCart(item, selectedOptions);
      }
      return;
    }

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

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!promotion.discountPercent) return originalPrice;
    return Math.floor(originalPrice * (1 - promotion.discountPercent / 100));
  };

  // Get menu items from promotionMenuItems or menuItems prop
  const displayMenuItems = menuItems.length > 0 
    ? menuItems 
    : (promotion.promotionMenuItems?.map(pmi => pmi.menuItem) || promotion.menuItems || []);

  // 일괄 장바구니 담기 핸들러
  const handleAddAllToCart = () => {
    if (displayMenuItems.length === 0) return;
    
    const itemsNeedingOptions: FrontendMenuItem[] = [];
    let addedCount = 0;

    displayMenuItems.forEach(item => {
      const frontendItem = convertBackendMenuItemToFrontend(item);
      
      // 옵션이 있는 메뉴는 나중에 처리하기 위해 저장
      if (frontendItem.options && frontendItem.options.length > 0) {
        itemsNeedingOptions.push(frontendItem);
      } else {
        // 옵션 없는 메뉴는 바로 장바구니에 추가
        addToCart(frontendItem);
        addedCount++;
      }
    });

    // 옵션이 필요한 메뉴가 있으면 첫 번째 항목부터 옵션 선택 모달 표시
    if (itemsNeedingOptions.length > 0) {
      setItemsWithOptions(itemsNeedingOptions);
      setCurrentItemForOptions(itemsNeedingOptions[0]);
      setShowOptionModal(true);
      setSelectedOptions([]);
      // 옵션 없는 메뉴가 추가되었으면 메시지 표시
      if (addedCount > 0) {
        toast.success(`${addedCount}${lang === 'ko' ? '개 항목이 추가되었습니다' : lang === 'vn' ? ' món đã được thêm' : ' items added'}`);
      }
    } else {
      // 모든 메뉴가 추가되었으면 성공 메시지
      if (addedCount > 0) {
        toast.success(UI_TEXT.addedToCart[lang]);
      }
    }
  };

  // 옵션 선택 완료 핸들러
  const handleOptionConfirm = () => {
    if (!currentItemForOptions) return;

    addToCart(currentItemForOptions, selectedOptions);
    
    // 다음 옵션이 필요한 항목 처리
    const remainingItems = itemsWithOptions.filter(item => item.id !== currentItemForOptions.id);
    
    if (remainingItems.length > 0) {
      setItemsWithOptions(remainingItems);
      setCurrentItemForOptions(remainingItems[0]);
      setSelectedOptions([]);
    } else {
      // 모든 항목 처리 완료
      setShowOptionModal(false);
      setCurrentItemForOptions(null);
      setItemsWithOptions([]);
      setSelectedOptions([]);
      toast.success(UI_TEXT.addedToCart[lang]);
    }
  };

  // 옵션 건너뛰기 핸들러
  const handleSkipOption = () => {
    if (!currentItemForOptions) return;

    // 다음 옵션이 필요한 항목 처리
    const remainingItems = itemsWithOptions.filter(item => item.id !== currentItemForOptions.id);
    
    if (remainingItems.length > 0) {
      setItemsWithOptions(remainingItems);
      setCurrentItemForOptions(remainingItems[0]);
      setSelectedOptions([]);
    } else {
      // 모든 항목 처리 완료
      setShowOptionModal(false);
      setCurrentItemForOptions(null);
      setItemsWithOptions([]);
      setSelectedOptions([]);
      toast.success(UI_TEXT.addedToCart[lang]);
    }
  };

  // 옵션 토글
  const toggleOption = (option: MenuOption) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      if (exists) return prev.filter(o => o.id !== option.id);
      return [...prev, option];
    });
  };

  // Debug logging
  React.useEffect(() => {
    console.log('[PromotionPopup] 메뉴 아이템 확인:', {
      menuItemsPropLength: menuItems.length,
      promotionMenuItemsLength: promotion.promotionMenuItems?.length || 0,
      promotionMenuItemsLength2: promotion.menuItems?.length || 0,
      displayMenuItemsLength: displayMenuItems.length,
      displayMenuItems: displayMenuItems.map(item => ({
        id: item.id,
        nameKo: item.nameKo,
        imageUrl: item.imageUrl || (item as any).imageQuery,
      })),
    });
  }, [menuItems, promotion, displayMenuItems]);

  // Helper function to get image URL
  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    const url = imageUrl.trim();
    if (!url) return null;
    
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // Relative path - use API base URL
    const apiBaseUrl = typeof window !== 'undefined' 
      ? (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '').replace(/\/$/, '') || window.location.origin)
      : '';
    
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${apiBaseUrl}${normalizedPath}`;
  };

  // Get first few menu items for preview in header (max 3)
  const previewMenuItems = displayMenuItems.slice(0, 3);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-lg max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {/* Image with Overlay */}
            {promotion.imageUrl ? (
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <img
                  src={getImageUrl(promotion.imageUrl) || ''}
                  alt={getLocalizedTitle()}
                  className="w-full h-full object-cover"
                />
                
                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                
                {/* 제목과 설명 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {getLocalizedTitle()}
                  </h2>
                  {getLocalizedDescription() && (
                    <p className="text-lg text-white/90 drop-shadow-md" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                      {getLocalizedDescription()}
                    </p>
                  )}
                </div>
                
                {/* 플로팅 장바구니 담기 버튼 */}
                {displayMenuItems.length > 0 && setCart && (
                  <Button
                    onClick={handleAddAllToCart}
                    className="absolute bottom-4 right-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 z-10"
                    size="lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {UI_TEXT.addAllToCart[lang]}
                  </Button>
                )}
                
                {/* 할인 배지 */}
                {promotion.discountPercent && (
                  <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg z-10">
                    {promotion.discountPercent}% {UI_TEXT.discount[lang]}
                  </div>
                )}
              </div>
            ) : (
              /* 이미지가 없는 경우 기존 헤더 레이아웃 유지 */
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="text-2xl font-bold text-left">
                  {getLocalizedTitle()}
                </DialogTitle>
                {getLocalizedDescription() && (
                  <DialogDescription className="text-left text-base mt-2">
                    {getLocalizedDescription()}
                  </DialogDescription>
                )}
              </DialogHeader>
            )}

            {/* Menu Items Grid */}
            {displayMenuItems.length > 0 && (
              <div className="px-6 pb-6">
                <h4 className="text-lg font-semibold mb-4 text-foreground">
                  {lang === 'ko' ? '할인 메뉴' : 
                   lang === 'vn' ? 'Món giảm giá' :
                   lang === 'zh' ? '折扣菜单' :
                   lang === 'ru' ? 'Меню со скидкой' :
                   'Discounted Menu'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {displayMenuItems.map((item) => {
                    const originalPrice = item.priceVnd;
                    const discountedPrice = calculateDiscountedPrice(originalPrice);
                    const hasDiscount = promotion.discountPercent && promotion.discountPercent > 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (onMenuClick) {
                            onMenuClick(item);
                          }
                          onClose();
                        }}
                        className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all text-left"
                      >
                        {/* Menu Image */}
                        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                          {(() => {
                            const itemImageUrl = getImageUrl(item.imageUrl || (item as any).imageQuery);
                            return itemImageUrl ? (
                              <img
                                src={itemImageUrl}
                                alt={getMenuItemName(item)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                              </div>
                            );
                          })()}
                          {hasDiscount && (
                            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold">
                              {promotion.discountPercent}%
                            </Badge>
                          )}
                        </div>

                        {/* Menu Info */}
                        <div className="p-3 space-y-1">
                          <h5 className="font-semibold text-sm text-foreground line-clamp-2">
                            {getMenuItemName(item)}
                          </h5>
                          <div className="flex items-center gap-2">
                            {hasDiscount ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  <CurrencyDisplay amountVND={originalPrice} className="text-xs" />
                                </span>
                                <CurrencyDisplay 
                                  amountVND={discountedPrice} 
                                  className="text-sm font-bold text-primary" 
                                />
                              </>
                            ) : (
                              <CurrencyDisplay 
                                amountVND={originalPrice} 
                                className="text-sm font-semibold text-foreground" 
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 pb-6 pt-4 border-t border-border space-y-2">
              {displayMenuItems.length > 0 && setCart && !promotion.imageUrl && (
                <Button
                  onClick={handleAddAllToCart}
                  className="w-full bg-primary text-primary-foreground"
                  size="lg"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {UI_TEXT.addAllToCart[lang]}
                </Button>
              )}
              <Button
                onClick={onHideToday}
                variant="outline"
                className="w-full border-border hover:bg-muted hover:text-foreground"
              >
                {UI_TEXT.hideToday[lang]}
              </Button>
              <Button
                onClick={onClose}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {UI_TEXT.ok[lang]}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* 옵션 선택 모달 */}
      {showOptionModal && currentItemForOptions && (
        <Dialog open={showOptionModal} onOpenChange={setShowOptionModal}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getMenuItemName(currentItemForOptions)}</DialogTitle>
              <DialogDescription>
                {lang === 'ko' ? '옵션을 선택하세요' : 
                 lang === 'vn' ? 'Chọn tùy chọn' :
                 lang === 'zh' ? '请选择选项' :
                 lang === 'ru' ? 'Выберите опции' :
                 'Select options'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {currentItemForOptions.options?.map(option => {
                const isSelected = selectedOptions.some(o => o.id === option.id);
                const optionName = lang === 'ko' ? option.labelKO :
                                  lang === 'vn' ? option.labelVN :
                                  lang === 'zh' ? option.labelZH || option.labelEN || option.labelKO :
                                  lang === 'ru' ? option.labelRU || option.labelEN || option.labelKO :
                                  option.labelEN || option.labelKO;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{optionName}</span>
                      <div className="flex items-center gap-2">
                        {option.priceVND > 0 && (
                          <span className="text-sm text-muted-foreground">
                            +<CurrencyDisplay amountVND={option.priceVND} className="text-sm" />
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkipOption}
                className="flex-1"
              >
                {lang === 'ko' ? '건너뛰기' : 
                 lang === 'vn' ? 'Bỏ qua' :
                 lang === 'zh' ? '跳过' :
                 lang === 'ru' ? 'Пропустить' :
                 'Skip'}
              </Button>
              <Button
                onClick={handleOptionConfirm}
                className="flex-1"
              >
                {lang === 'ko' ? '담기' : 
                 lang === 'vn' ? 'Thêm' :
                 lang === 'zh' ? '加入' :
                 lang === 'ru' ? 'Добавить' :
                 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
