import React, { useState } from 'react';
import { Languages, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { BackendChatMessage, BackendPromotion } from '../../types/api';

interface ChatBubbleProps {
  message: BackendChatMessage;
  language: 'ko' | 'vn' | 'en' | 'zh' | 'ru';
  tableNumber?: number;
  promotions?: BackendPromotion[];
}

const getMessageText = (message: BackendChatMessage, language: 'ko' | 'vn' | 'en' | 'zh' | 'ru'): string => {
  if (language === 'ko') return message.textKo || message.textEn || message.textVn || '';
  if (language === 'vn') return message.textVn || message.textEn || message.textKo || '';
  if (language === 'zh') return message.textZh || message.textEn || message.textKo || message.textVn || '';
  if (language === 'ru') return message.textRu || message.textEn || message.textKo || message.textVn || '';
  return message.textEn || message.textKo || message.textVn || '';
};

const getTranslatedText = (message: BackendChatMessage, language: 'ko' | 'vn' | 'en' | 'zh' | 'ru'): string => {
  if (language === 'ko') {
    // 상점앱이 한국어일 때: 다른 언어 메시지의 한국어 번역 반환
    // 러시아어 메시지는 백엔드에서 textKo에 번역되어 저장됨
    return message.textKo || message.textVn || message.textEn || '';
  }
  if (language === 'vn') {
    // 상점앱이 베트남어일 때: 다른 언어 메시지의 베트남어 번역 반환
    // 러시아어 메시지는 백엔드에서 textVn에 번역되어 저장됨
    return message.textVn || message.textKo || message.textEn || '';
  }
  if (language === 'zh') {
    // 상점앱이 중국어일 때: 다른 언어 메시지의 영어 또는 한국어 반환
    // 러시아어 메시지는 textEn에 원문이 저장되어 있음
    return message.textEn || message.textKo || '';
  }
  if (language === 'ru') {
    // 상점앱이 러시아어일 때: 다른 언어 메시지를 러시아어로 번역 (현재는 원문 사용)
    // TODO: 백엔드에서 러시아어 번역 지원 시 업데이트 필요
    return message.textEn || message.textKo || message.textVn || '';
  }
  // 영어일 때: 다른 언어 메시지의 영어 번역 반환
  // 러시아어 메시지는 textEn에 원문이 저장되어 있음
  return message.textEn || message.textKo || message.textVn || '';
};


const ChatBubble: React.FC<ChatBubbleProps> = ({ message, language, tableNumber, promotions = [] }) => {
  const { t } = useLanguage();
  const [avatarError, setAvatarError] = React.useState(false);
  const isUser = message.senderType === 'USER';
  // 주문 상태 메시지(SYSTEM 타입이지만 metadata에 orderStatus가 있음)는 STAFF처럼 표시
  const isOrderStatusMessage = message.senderType === 'SYSTEM' && message.metadata?.orderStatus;
  const isStaff = message.senderType === 'STAFF' || isOrderStatusMessage;
  const isSystem = message.senderType === 'SYSTEM' && !isOrderStatusMessage;
  const isRequest = message.messageType === 'REQUEST';
  const isImage = message.messageType === 'IMAGE' && !!message.imageUrl;
  const detectedLanguage = message.detectedLanguage || null;
  const originalText = detectedLanguage ? getMessageText(message, detectedLanguage) : getMessageText(message, language);
  const translatedText = getMessageText(message, language);
  const showOriginal = !!detectedLanguage && detectedLanguage !== language;
  const messageText = showOriginal ? (originalText || translatedText) : (translatedText || originalText);
  const [showTranslation, setShowTranslation] = useState(false);
  const hasTranslation = !!translatedText && translatedText !== originalText;
  const canTranslate =
    isUser &&
    message.detectedLanguage !== undefined &&
    message.detectedLanguage !== null &&
    message.detectedLanguage !== language &&
    hasTranslation;
  const displayTranslatedText = translatedText || messageText;
  const timeText = new Intl.DateTimeFormat(
    language === 'vn' ? 'vi-VN' : language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : language === 'ru' ? 'ru-RU' : 'ko-KR',
    { hour: '2-digit', minute: '2-digit' },
  ).format(new Date(message.createdAt));

  return (
    <div className={`flex w-full mb-6 sm:mb-7 items-end gap-1.5 sm:gap-2 min-w-0 ${isStaff ? 'justify-end' : isUser ? 'justify-start' : 'justify-center'}`}>
      {/* 상대방 메시지에만 아바타 표시 */}
      {isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mb-1 overflow-hidden border border-white/30">
          {!avatarError ? (
            <img 
              src="/customer-avatar.png"
              alt="Customer"
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          )}
        </div>
      )}
      <div
        className={`${isUser 
          ? 'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%]' 
          : isStaff 
          ? 'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%]' 
          : 'max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%]'
        } min-w-0 flex-shrink rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm relative leading-relaxed ${
          isStaff
            ? 'text-foreground rounded-br-md'
            : isUser
            ? 'text-foreground rounded-bl-md shadow-md'
            : 'bg-muted text-muted-foreground border border-border'
        }`}
        style={isStaff ? { backgroundColor: '#FFEB00' } : isUser ? { backgroundColor: '#000957', color: '#FFFFFF' } : undefined}
      >

          {isImage && (
            <div className="mb-3 rounded-xl overflow-hidden bg-black/5 -mx-1 -mt-1">
              <img src={message.imageUrl || ''} alt="Attachment" className="w-full h-auto max-h-64 object-cover" />
            </div>
          )}

          {/* 주문 메시지가 아닌 경우 일반 텍스트 표시 */}
          {message.messageType !== 'ORDER' && messageText && (
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <p className={`text-sm sm:text-[15px] break-words ${isStaff ? 'font-normal' : 'font-medium'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{messageText}</p>
              {canTranslate && (
                <div className="mt-0.5">
                  {!showTranslation ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowTranslation(true);
                      }}
                      className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-medium opacity-70 hover:opacity-100 transition-opacity mt-0.5 sm:mt-1 ${
                        isStaff ? 'text-foreground/80 hover:text-foreground' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <Languages size={12} />
                      {t('chat.translate')}
                    </button>
                  ) : (
                    <div className="overflow-hidden">
                      <div className={`h-px w-full my-1.5 sm:my-2 ${isStaff ? 'bg-foreground/20' : 'bg-white/20'}`} />
                      <p className={`text-xs sm:text-[13px] leading-relaxed ${isStaff ? 'text-foreground/90' : 'text-white/90'}`}>{displayTranslatedText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 주문 메시지인 경우: "주문합니다:"를 첫 줄에, 주문 상세를 아래에 표시 */}
          {message.messageType === 'ORDER' && (() => {
            // 메시지 텍스트에서 "주문합니다:" 부분 추출
            const orderPrefixKo = '주문합니다:';
            const orderPrefixVn = 'Đặt món:';
            const orderPrefixEn = 'Order:';
            const orderPrefixZh = '点餐:';
            const orderPrefixRu = 'Заказ:';
            
            const getOrderPrefix = () => {
              if (language === 'ko') return orderPrefixKo;
              if (language === 'vn') return orderPrefixVn;
              if (language === 'zh') return orderPrefixZh;
              if (language === 'ru') return orderPrefixRu;
              return orderPrefixEn;
            };
            
            const orderPrefix = getOrderPrefix();
            const orderItems = Array.isArray(message.metadata) ? message.metadata : null;
            
            return (
              <div className="flex flex-col gap-3">
                {/* "주문합니다:" 헤더 */}
                <p className={`text-sm sm:text-[15px] font-medium ${isStaff ? 'font-normal' : 'font-medium'}`}>
                  {orderPrefix}
                </p>
                
                {/* 주문 상세 */}
                {orderItems && orderItems.length > 0 && (
                  <div className="space-y-2 sm:space-y-3 w-full min-w-[180px] sm:min-w-[200px] mt-2 sm:mt-3">
                    {orderItems.map((item: any, idx: number) => {
                      const itemName = language === 'ko' ? item.nameKO : language === 'vn' ? item.nameVN : language === 'zh' ? (item.nameZH || item.nameEN || item.nameKO) : (item.nameEN || item.nameKO);
                      const itemSub = language === 'vn' ? (item.nameEN || item.nameKO) : language === 'zh' ? (item.nameEN || item.nameKO) : item.nameVN;
                      const imageUrl = item.imageQuery || item.imageUrl || '';
                      const quantity = item.quantity || 1;
                      
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

                      const menuItemId = item.menuItemId || item.id;
                      const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                      const originalUnitPrice = item.unitPrice || 0; // 원래 메뉴 항목 단가
                      const discountedUnitPrice = activePromotion 
                        ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                        : originalUnitPrice;
                      
                      const selectedOptions = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
                      
                      // 옵션 총액 계산 (옵션은 할인 대상이 아님)
                      const optionsTotal = selectedOptions.reduce((sum: number, opt: any) => {
                        const optPrice = opt.priceVND || opt.price || 0;
                        const optQuantity = opt.quantity || 1;
                        return sum + (optPrice * optQuantity);
                      }, 0);
                      
                      // 주문 항목 총액 = (할인된 단가 × 수량) + 옵션 총액
                      const itemTotal = (discountedUnitPrice * quantity) + optionsTotal;
                      
                      return (
                        <div key={item.id || item.menuItemId || idx} className="flex gap-2 sm:gap-3">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 ${isStaff ? 'bg-foreground/10' : 'bg-white/10'}`}>
                            {imageUrl ? (
                              <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <User size={16} className={isStaff ? 'text-foreground/40' : 'text-white/40'} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <span className={`text-xs sm:text-sm font-bold truncate ${isStaff ? 'text-foreground' : 'text-white'}`}>{itemName}</span>
                              <span className={`text-xs sm:text-sm font-bold ml-1.5 sm:ml-2 shrink-0 ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemTotal)}
                              </span>
                            </div>
                            {itemSub && (
                              <p className={`text-[10px] sm:text-xs truncate ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>{itemSub}</p>
                            )}
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                              {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                                <span className="flex items-center gap-1">
                                  <span className="line-through opacity-60">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalUnitPrice)}
                                  </span>
                                  <span>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {quantity}
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {quantity}
                                </span>
                              )}
                            </div>
                            {selectedOptions.length > 0 && (
                              <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-muted/30">
                                {selectedOptions.map((opt: any, i: number) => {
                                  const optLabel = language === 'ko' ? opt.labelKO : language === 'vn' ? opt.labelVN : language === 'zh' ? (opt.labelZH || opt.labelEN || opt.labelKO) : language === 'ru' ? (opt.labelRU || opt.labelEN || opt.labelKO) : (opt.labelEN || opt.labelKO);
                                  const optPrice = opt.priceVND || opt.price || 0;
                                  const optQuantity = opt.quantity || 1;
                                  return (
                                    <div key={i} className="flex justify-between items-center text-[9px] sm:text-[10px]">
                                      <span className={`${isStaff ? 'text-foreground/70' : 'text-white/70'}`}>
                                        + {optLabel} {optQuantity > 1 ? `× ${optQuantity}` : ''}
                                      </span>
                                      <span className={`${isStaff ? 'text-foreground/70' : 'text-white/70'}`}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(optPrice * optQuantity)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* 총 합계는 주문 타입 메시지에만 표시 */}
                    {orderItems.length > 0 && (
                      <div className={`pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t flex justify-between items-center ${isStaff ? 'border-foreground/20' : 'border-white/20'}`}>
                        <span className={`text-[10px] sm:text-xs ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>
                          {t('chat.total')}
                        </span>
                        <span className={`text-xs sm:text-sm font-bold ${isStaff ? 'text-foreground' : 'text-white'}`}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            orderItems.reduce((sum: number, item: any) => {
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

                              const menuItemId = item.menuItemId || item.id;
                              const activePromotion = menuItemId ? getActivePromotionForMenuItem(menuItemId) : null;
                              const originalUnitPrice = item.unitPrice || 0;
                              const discountedUnitPrice = activePromotion 
                                ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                                : originalUnitPrice;
                              const itemQty = item.quantity || 1;
                              const selectedOptions = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
                              const optionsTotal = selectedOptions.reduce((optSum: number, opt: any) => {
                                const optPrice = opt.priceVND || opt.price || 0;
                                const optQuantity = opt.quantity || 1;
                                return optSum + (optPrice * optQuantity);
                              }, 0);
                              return sum + (discountedUnitPrice * itemQty) + optionsTotal;
                            }, 0)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <span
            className={`text-[8px] sm:text-[9px] absolute -bottom-4 sm:-bottom-5 ${
              isStaff ? 'right-0' : isUser ? 'left-0' : 'left-1/2 -translate-x-1/2'
            }`}
            style={{ color: '#FFFFFF' }}
          >
            {timeText}
          </span>
      </div>
    </div>
  );
};

export default ChatBubble;
