import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChatMessage } from '../../types';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTranslation } from '../../i18n/translations';

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { lang: userLang } = useLanguage();
  const isUser = message.sender === 'user';
  const [showTranslation, setShowTranslation] = useState(false);

  // Determine text to display based on configured language
  let primaryText = message.textKO;
  let translatedText = message.textVN;
  let dateFormatLocale = 'ko-KR';

  switch (userLang) {
    case 'en':
      primaryText = message.textEN || message.textKO;
      translatedText = message.textVN; // Translate to Local (VN)
      dateFormatLocale = 'en-US';
      break;
    case 'vn':
      primaryText = message.textVN || message.textKO;
      translatedText = message.textKO; // Translate to Guest (KO) - assuming context
      dateFormatLocale = 'vi-VN';
      break;
    case 'ko':
    default:
      primaryText = message.textKO;
      translatedText = message.textVN; // Translate to Local (VN)
      dateFormatLocale = 'ko-KR';
      break;
  }

  const hasTranslation = !!translatedText && translatedText !== primaryText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex w-full mb-7 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm relative leading-relaxed ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-md' 
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md shadow-md'
        }`}
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
            {hasTranslation && (
               <div className="mt-0.5">
                 {!showTranslation ? (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowTranslation(true);
                     }}
                     className={`flex items-center gap-1 text-[10px] font-medium opacity-70 hover:opacity-100 transition-opacity mt-1 ${
                       isUser ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-gray-600'
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
                     <div className={`h-px w-full my-2 ${isUser ? 'bg-white/20' : 'bg-gray-100'}`} />
                     <p className={`text-[13px] leading-relaxed ${isUser ? 'text-blue-50' : 'text-gray-600'}`}>
                       {translatedText}
                     </p>
                   </motion.div>
                 )}
               </div>
            )}
          </div>
        )}

        {/* Order Details (if order type or system message with order items) */}
        {(() => {
          // Handle order type message (metadata is array)
          const orderItems = message.type === 'order' && Array.isArray(message.metadata) 
            ? message.metadata 
            : null;
          
          // Handle system message with order items (metadata.items is array)
          const systemOrderItems = message.sender === 'system' && 
            message.metadata && 
            message.metadata.items && 
            Array.isArray(message.metadata.items)
            ? message.metadata.items
            : null;
          
          const itemsToDisplay = orderItems || systemOrderItems;
          
          if (!itemsToDisplay || itemsToDisplay.length === 0) return null;
          
          return (
            <div className="space-y-3 w-full min-w-[200px] mt-3">
              <div className={`text-sm font-bold border-b pb-2 mb-2 ${isUser ? 'border-white/20' : 'border-gray-100'}`}>
                {getTranslation('chat.orderDetails', userLang)}
              </div>
              {itemsToDisplay.map((item: any, idx: number) => {
                const itemName = userLang === 'ko' ? item.nameKO : userLang === 'vn' ? item.nameVN : (item.nameEN || item.nameKO);
                const itemSub = userLang === 'vn' ? (item.nameEN || item.nameKO) : item.nameVN;
                const imageUrl = item.imageQuery || item.imageUrl || '';
                const priceVND = item.priceVND || item.totalPrice || 0;
                
                return (
                  <div key={item.id || idx} className="flex gap-3">
                    <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 ${isUser ? 'bg-white/10' : 'bg-gray-100'}`}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Languages size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold truncate ${isUser ? 'text-white' : 'text-gray-900'}`}>{itemName}</span>
                        <span className={`text-sm font-bold ml-2 ${isUser ? 'text-blue-100' : 'text-gray-900'}`}>×{item.quantity}</span>
                      </div>
                      {itemSub && (
                        <p className={`text-xs truncate ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>{itemSub}</p>
                      )}
                      {item.selectedOptions?.map((opt: any, i: number) => {
                        const optLabel = userLang === 'ko' ? opt.labelKO : userLang === 'vn' ? opt.labelVN : (opt.labelEN || opt.labelKO);
                        return (
                          <span key={i} className={`text-[10px] mr-1 px-1.5 py-0.5 rounded ${isUser ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                            {optLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* 총 합계는 주문 타입 메시지에만 표시 (시스템 메시지에는 표시하지 않음) */}
              {itemsToDisplay.length > 0 && message.type === 'order' && (
                <div className={`pt-2 mt-2 border-t flex justify-between items-center ${isUser ? 'border-white/20' : 'border-gray-100'}`}>
                  <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>{getTranslation('chat.total', userLang)}</span>
                  <span className={`text-sm font-bold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      itemsToDisplay.reduce((sum: number, item: any) => {
                        const itemPrice = item.priceVND || item.totalPrice || 0;
                        const itemQty = item.quantity || 1;
                        return sum + (itemPrice * itemQty);
                      }, 0)
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Timestamp */}
        <span className={`text-[9px] absolute -bottom-5 ${isUser ? 'right-0 text-gray-400' : 'left-0 text-gray-400'}`}>
          {new Intl.DateTimeFormat(dateFormatLocale, { hour: 'numeric', minute: 'numeric' }).format(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
};

export default ChatBubble;