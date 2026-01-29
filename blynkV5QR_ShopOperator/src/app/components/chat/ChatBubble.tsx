import React, { useState } from 'react';
import { Languages, User } from 'lucide-react';
import { BackendChatMessage } from '../../types/api';

interface ChatBubbleProps {
  message: BackendChatMessage;
  language: 'ko' | 'vn' | 'en';
  tableNumber?: number;
}

const getMessageText = (message: BackendChatMessage, language: 'ko' | 'vn' | 'en'): string => {
  if (language === 'ko') return message.textKo || message.textEn || message.textVn || '';
  if (language === 'vn') return message.textVn || message.textEn || message.textKo || '';
  return message.textEn || message.textKo || message.textVn || '';
};

const getTranslatedText = (message: BackendChatMessage, language: 'ko' | 'vn' | 'en'): string => {
  if (language === 'ko') return message.textVn || message.textEn || '';
  if (language === 'vn') return message.textKo || message.textEn || '';
  return message.textKo || message.textVn || '';
};


const getTranslateLabel = (language: 'ko' | 'vn' | 'en'): string => {
  if (language === 'ko') return '번역하기';
  if (language === 'vn') return 'Dich';
  return 'Translate';
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, language, tableNumber }) => {
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
    language === 'vn' ? 'vi-VN' : language === 'en' ? 'en-US' : 'ko-KR',
    { hour: '2-digit', minute: '2-digit' },
  ).format(new Date(message.createdAt));

  return (
    <div className={`flex w-full mb-6 sm:mb-7 items-end gap-1.5 sm:gap-2 ${isStaff ? 'justify-end' : isUser ? 'justify-start' : 'justify-center'}`}>
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
        className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm relative leading-relaxed ${
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
                      {getTranslateLabel(language)}
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
            
            const getOrderPrefix = () => {
              if (language === 'ko') return orderPrefixKo;
              if (language === 'vn') return orderPrefixVn;
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
                      const itemName = language === 'ko' ? item.nameKO : language === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
                      const itemSub = language === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
                      const imageUrl = item.imageQuery || item.imageUrl || '';
                      const quantity = item.quantity || 1;
                      
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
                              <span className={`text-xs sm:text-sm font-bold ml-1.5 sm:ml-2 ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>×{quantity}</span>
                            </div>
                            {itemSub && (
                              <p className={`text-[10px] sm:text-xs truncate ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>{itemSub}</p>
                            )}
                            {item.selectedOptions?.map((opt: any, i: number) => {
                              const optLabel = language === 'ko' ? opt.labelKO : language === 'vn' ? opt.labelVN : (opt.labelEN || opt.labelKO);
                              return (
                                <span 
                                  key={i} 
                                  className={`text-[9px] sm:text-[10px] mr-1 px-1 sm:px-1.5 py-0.5 rounded ${isStaff ? 'text-foreground' : 'text-white'}`}
                                  style={isStaff ? { backgroundColor: 'rgba(0, 0, 0, 0.1)' } : { backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                >
                                  {optLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {/* 총 합계는 주문 타입 메시지에만 표시 */}
                    {orderItems.length > 0 && (
                      <div className={`pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t flex justify-between items-center ${isStaff ? 'border-foreground/20' : 'border-white/20'}`}>
                        <span className={`text-[10px] sm:text-xs ${isStaff ? 'text-foreground/80' : 'text-white/80'}`}>
                          {language === 'ko' ? '총합계' : language === 'vn' ? 'Tổng cộng' : 'Total'}
                        </span>
                        <span className={`text-xs sm:text-sm font-bold ${isStaff ? 'text-foreground' : 'text-white'}`}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            orderItems.reduce((sum: number, item: any) => {
                              const itemPrice = item.priceVND || item.totalPrice || 0;
                              const itemQty = item.quantity || 1;
                              return sum + (itemPrice * itemQty);
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
