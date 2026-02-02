import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Promotion } from '../../../lib/api';
import type { LangType } from '../../i18n/translations';

interface PromotionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onHideToday: () => void;
  promotion: Promotion;
  lang: LangType;
}

const UI_TEXT = {
  hideToday: {
    ko: '오늘 하루 안보기',
    vn: 'Ẩn hôm nay',
    en: "Don't show today",
    zh: '今天不再显示',
  },
};

export const PromotionPopup: React.FC<PromotionPopupProps> = ({
  isOpen,
  onClose,
  onHideToday,
  promotion,
  lang,
}) => {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="flex flex-col">
              {/* Image */}
              {promotion.imageUrl && (
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <img
                    src={promotion.imageUrl}
                    alt={getLocalizedTitle()}
                    className="w-full h-full object-cover"
                  />
                  {promotion.discountPercent && (
                    <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                      {promotion.discountPercent}% 할인
                    </div>
                  )}
                </div>
              )}

              {/* Text content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {getLocalizedTitle()}
                  </h3>
                  {getLocalizedDescription() && (
                    <p className="text-muted-foreground leading-relaxed">
                      {getLocalizedDescription()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={onHideToday}
                    className="w-full py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors"
                  >
                    {UI_TEXT.hideToday[lang]}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
