import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChatMessage } from '../../types';
import { Languages, User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTranslation } from '../../i18n/translations';
import { Promotion } from '../../../lib/api';

interface ChatBubbleProps {
  message: ChatMessage;
  promotions?: Promotion[];
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, promotions = [] }) => {
  const { lang: userLang } = useLanguage();
  const isUser = message.sender === 'user';
  const [showTranslation, setShowTranslation] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const getTextByLanguage = (lang: 'ko' | 'vn' | 'en' | 'zh' | 'ru') => {
    if (lang === 'ko') return message.textKO || '';
    if (lang === 'vn') return message.textVN || '';
    if (lang === 'zh') return message.textZH || message.textEN || message.textKO || '';
    if (lang === 'ru') return message.textRU || message.textEN || message.textKO || '';
    return message.textEN || message.textKO || '';
  };

  const detectedLanguage = message.detectedLanguage || null;
  const originalText = detectedLanguage ? getTextByLanguage(detectedLanguage) : '';
  const translatedText = getTextByLanguage(userLang);
  const showOriginal = !!detectedLanguage && detectedLanguage !== userLang;
  const primaryText = showOriginal ? (originalText || translatedText) : (translatedText || originalText);

  let dateFormatLocale = 'ko-KR';
  switch (userLang) {
    case 'en':
      dateFormatLocale = 'en-US';
      break;
    case 'vn':
      dateFormatLocale = 'vi-VN';
      break;
    case 'zh':
      dateFormatLocale = 'zh-CN';
      break;
    case 'ru':
      dateFormatLocale = 'ru-RU';
      break;
    case 'ko':
    default:
      dateFormatLocale = 'ko-KR';
      break;
  }

  const hasTranslation = !!translatedText && translatedText !== originalText;
  const canTranslate =
    message.sender === 'staff' &&
    message.detectedLanguage !== undefined &&
    message.detectedLanguage !== null &&
    message.detectedLanguage !== userLang &&
    hasTranslation;
  const displayTranslatedText = translatedText || primaryText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex w-full mb-7 items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* 상대방 메시지에만 아바타 표시 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mb-1 overflow-hidden border border-white/30">
          {!avatarError ? (
            <img 
              src="/staff-avatar.png"
              alt="Staff"
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <User size={16} className="text-white" />
          )}
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm relative leading-relaxed ${
          isUser 
            ? 'text-foreground rounded-br-md' 
            : 'text-foreground rounded-bl-md shadow-md'
        }`}
        style={isUser ? { backgroundColor: '#FFEB00' } : { backgroundColor: '#000957', color: '#FFFFFF' }}
      >
        {/* Image Attachment */}
        {message.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden bg-black/5 -mx-1 -mt-1">
            <img 
              src={message.imageUrl} 
              alt="Attachment" 
              className="w-full h-auto max-h-64 object-cover"
            />
          </div>
        )}

        {/* Text Content */}
        {message.type !== 'order' && (
          <div className="flex flex-col gap-1">
            {/* Primary Text */}
            <p className={`text-[15px] ${isUser ? 'font-normal' : 'font-medium'}`}>
              {primaryText}
            </p>
            
            {/* Translation Control */}
            {canTranslate && (
               <div className="mt-0.5">
                 {!showTranslation ? (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowTranslation(true);
                     }}
                    className={`flex items-center gap-1 text-[10px] font-medium opacity-70 hover:opacity-100 transition-opacity mt-1 ${
                      isUser ? 'text-foreground/80 hover:text-foreground' : 'text-white/80 hover:text-white'
                    }`}
                   >
                     <Languages size={12} />
                     {getTranslation('chat.translate', userLang)}
                   </button>
                 ) : (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }}
                     className="overflow-hidden"
                   >
                    <div className={`h-px w-full my-2 ${isUser ? 'bg-foreground/20' : 'bg-white/20'}`} />
                    <p className={`text-[13px] leading-relaxed ${isUser ? 'text-foreground/90' : 'text-white/90'}`}>
                      {displayTranslatedText}
                     </p>
                   </motion.div>
                 )}
               </div>
            )}
          </div>
        )}

        {/* Order Details (if order type or system/staff message with order items) */}
        {(() => {
          // Handle order type message (metadata is array)
          const orderItems = message.type === 'order' && Array.isArray(message.metadata) 
            ? message.metadata 
            : null;
          
          // Handle system/staff message with order items (metadata.items is array)
          // 주문 상태 변경 메시지는 STAFF 타입으로 저장되므로 staff도 확인해야 함
          const systemOrStaffOrderItems = (message.sender === 'system' || message.sender === 'staff') && 
            message.metadata && 
            message.metadata.items && 
            Array.isArray(message.metadata.items)
            ? message.metadata.items
            : null;
          
          const itemsToDisplay = orderItems || systemOrStaffOrderItems;
          
          if (!itemsToDisplay || itemsToDisplay.length === 0) return null;

          // 프로모션 할인 계산 함수들
          const getActivePromotionForMenuItem = (menuItemId: string) => {
            const now = new Date();
            return promotions.find(promo => {
              if (!promo.isActive || !promo.discountPercent) return false;
              const startDate = new Date(promo.startDate);
              const endDate = new Date(promo.endDate);
              endDate.setHours(23, 59, 59, 999);
              if (now < startDate || now > endDate) return false;
              
              // 메뉴 항목이 프로모션에 포함되는지 확인
              const menuItemIds = promo.promotionMenuItems?.map(pmi => pmi.menuItemId) || 
                                  promo.menuItems?.map(mi => mi.id) || [];
              return menuItemIds.includes(menuItemId);
            });
          };

          const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
            if (!discountPercent) return originalPrice;
            return Math.floor(originalPrice * (1 - discountPercent / 100));
          };
          
          return (
            <div className="space-y-3 w-full min-w-[200px] mt-3">
                <div className={`text-sm font-bold border-b pb-2 mb-2 ${isUser ? 'border-foreground/20' : 'border-white/20'}`}>
                {getTranslation('chat.orderDetails', userLang)}
              </div>
              {itemsToDisplay.map((item: any, idx: number) => {
                const itemName = userLang === 'ko' ? item.nameKO : userLang === 'vn' ? item.nameVN : userLang === 'zh' ? (item.nameZH || item.nameEN || item.nameKO) : userLang === 'ru' ? (item.nameRU || item.nameEN || item.nameKO) : (item.nameEN || item.nameKO);
                const itemSub = userLang === 'vn' ? (item.nameEN || item.nameKO) : userLang === 'zh' ? item.nameVN : userLang === 'ru' ? item.nameVN : item.nameVN;
                const imageUrl = item.imageQuery || item.imageUrl || '';
                
                // 프로모션 할인 적용
                const menuItemId = item.menuItemId || item.id;
                const activePromotion = getActivePromotionForMenuItem(menuItemId);
                const originalUnitPrice = item.unitPrice || 0; // 원래 메뉴 항목 단가
                const discountedUnitPrice = activePromotion 
                  ? calculateDiscountedPrice(originalUnitPrice, activePromotion.discountPercent)
                  : originalUnitPrice;
                
                const itemQuantity = item.quantity || 1;
                
                // selectedOptions가 배열인지 확인하고, 없으면 빈 배열로 설정
                const selectedOptions = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
                
                // 옵션 총액 계산 (옵션은 할인 대상이 아님)
                const optionsTotal = selectedOptions.reduce((sum: number, opt: any) => {
                  const optPrice = opt.priceVND || opt.price || 0;
                  const optQuantity = opt.quantity || 1;
                  return sum + (optPrice * optQuantity);
                }, 0);
                
                // 주문 항목 총액 = (할인된 단가 × 수량) + 옵션 총액
                const itemTotal = (discountedUnitPrice * itemQuantity) + optionsTotal;
                
                // 디버깅: selectedOptions 확인
                if (import.meta.env.DEV && (message.sender === 'system' || message.sender === 'staff')) {
                  console.log('[ChatBubble] Order item:', {
                    itemName,
                    unitPrice,
                    itemQuantity,
                    optionsTotal,
                    itemTotal,
                    selectedOptions,
                    item: item,
                    messageSender: message.sender,
                    messageType: message.type,
                  });
                }
                
                return (
                  <div key={item.id || idx} className="flex gap-3">
                    <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 ${isUser ? 'bg-foreground/10' : 'bg-white/10'}`}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Languages size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold truncate ${isUser ? 'text-foreground' : 'text-white'}`}>{itemName}</span>
                        <span className={`text-sm font-bold ml-2 shrink-0 ${isUser ? 'text-foreground/80' : 'text-white/80'}`}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemTotal)}
                        </span>
                      </div>
                      {itemSub && (
                        <p className={`text-xs truncate ${isUser ? 'text-foreground/80' : 'text-white/80'}`}>{itemSub}</p>
                      )}
                      <div className={`text-xs mt-0.5 ${isUser ? 'text-foreground/70' : 'text-white/70'}`}>
                        {activePromotion && originalUnitPrice !== discountedUnitPrice ? (
                          <span className="flex items-center gap-1">
                            <span className="line-through opacity-60">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalUnitPrice)}
                            </span>
                            <span>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {itemQuantity}
                            </span>
                          </span>
                        ) : (
                          <span>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountedUnitPrice)} × {itemQuantity}
                          </span>
                        )}
                      </div>
                      {selectedOptions.length > 0 && (
                        <div className="space-y-0.5 mt-1 pl-2 border-l-2 border-muted/30">
                          {selectedOptions.map((opt: any, i: number) => {
                            const optLabel = userLang === 'ko' ? opt.labelKO : userLang === 'vn' ? opt.labelVN : userLang === 'zh' ? (opt.labelZH || opt.labelEN || opt.labelKO) : (opt.labelEN || opt.labelKO);
                            const optPrice = opt.priceVND || opt.price || 0;
                            const optQuantity = opt.quantity || 1;
                            return (
                              <div key={i} className="flex justify-between items-center text-[10px]">
                                <span className={`${isUser ? 'text-foreground/70' : 'text-white/70'}`}>
                                  + {optLabel} {optQuantity > 1 ? `× ${optQuantity}` : ''}
                                </span>
                                <span className={`${isUser ? 'text-foreground/70' : 'text-white/70'}`}>
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
              {/* 총 합계는 주문 타입 메시지에만 표시 (시스템 메시지에는 표시하지 않음) */}
              {itemsToDisplay.length > 0 && message.type === 'order' && (
                <div className={`pt-2 mt-2 border-t flex justify-between items-center ${isUser ? 'border-foreground/20' : 'border-white/20'}`}>
                  <span className={`text-xs ${isUser ? 'text-foreground/80' : 'text-white/80'}`}>{getTranslation('chat.total', userLang)}</span>
                  <span className={`text-sm font-bold ${isUser ? 'text-foreground' : 'text-white'}`}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      itemsToDisplay.reduce((sum: number, item: any) => {
                        const menuItemId = item.menuItemId || item.id;
                        const activePromotion = getActivePromotionForMenuItem(menuItemId);
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
          );
        })()}

        {/* Timestamp */}
        <span 
          className={`text-[9px] absolute -bottom-5 ${isUser ? 'right-0' : 'left-0'}`}
          style={{ color: '#FFFFFF' }}
        >
          {new Intl.DateTimeFormat(dateFormatLocale, { hour: 'numeric', minute: 'numeric' }).format(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
};

export default ChatBubble;