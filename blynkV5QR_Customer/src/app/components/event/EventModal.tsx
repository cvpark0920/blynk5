import React from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, ArrowRight, Play } from 'lucide-react';
import { MenuItem } from '../../types';
import { CurrencyDisplay } from '../CurrencyDisplay';

type LangType = 'ko' | 'vn' | 'en' | 'zh';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LangType;
  menuItems: MenuItem[];
}

const UI_TEXT = {
  title: { ko: '이벤트', vn: 'Sự kiện', en: 'Events', zh: '活动' },
  promoTitle: { ko: '이번 달 프로모션', vn: 'Khuyến mãi tháng này', en: 'This Month Promo', zh: '本月优惠' },
  promoDesc: { ko: '모든 쌀국수 메뉴 10% 할인', vn: 'Giảm 10% cho tất cả các món Phở', en: '10% OFF all Pho', zh: '所有河粉类菜单享10%折扣' },
  newMenu: { ko: '새로운 메뉴', vn: 'Món mới', en: 'New Arrivals', zh: '新品尝鲜' },
  popularMenu: { ko: '인기 메뉴', vn: 'Món phổ biến', en: 'Popular Items', zh: '人气推荐' },
  youtubeTitle: { ko: '브랜드 스토리', vn: 'Câu chuyện thương hiệu', en: 'Brand Story', zh: '品牌故事' },
  viewDetails: { ko: '더 보기', vn: 'Xem thêm', en: 'View More', zh: '查看更多' },
};

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, lang, menuItems }) => {
  // 처음 2개를 새 메뉴로, 다음 2개를 인기 메뉴로 표시 (실제로는 백엔드에서 관리)
  const newItems = menuItems.slice(0, 2);
  const popularItems = menuItems.slice(2, 4);
  const dragControls = useDragControls();

  const getLocalizedName = (item: any) => lang === 'ko' ? item.nameKO : lang === 'vn' ? item.nameVN : lang === 'zh' ? (item.nameZH || item.nameEN || item.nameKO) : (item.nameEN || item.nameKO);
  const getLocalizedDesc = (item: any) => lang === 'ko' ? item.descriptionKO : lang === 'vn' ? item.descriptionVN : lang === 'zh' ? (item.descriptionZH || item.descriptionEN || item.descriptionKO) : (item.descriptionEN || item.descriptionKO);

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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
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
            className="fixed inset-x-0 bottom-0 z-50 bg-card flex flex-col h-[90%] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-hidden text-foreground"
          >
            {/* Minimal Header - Draggable */}
            <div 
              className="relative flex items-center justify-between px-6 py-5 z-10 bg-card/80 backdrop-blur-md sticky top-0 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/70 rounded-full" />

              <h2 className="text-2xl font-bold tracking-tight text-foreground">{UI_TEXT.title[lang]}</h2>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-safe scroll-smooth">
              <div className="flex flex-col gap-10 pb-10">
                
                {/* Promotion Section - Hero Style */}
                <div className="px-6 mt-2">
                  <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden group cursor-pointer">
                    <img 
                      src="https://images.unsplash.com/photo-1758709187839-7b181ce8968a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMGZvb2QlMjBwcm9tb3Rpb24lMjBiYW5uZXJ8ZW58MXx8fHwxNzY3MTU1MTcwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Promotion"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-wider mb-3 w-fit">
                        PROMO
                      </div>
                      <h3 className="text-white font-bold text-3xl leading-tight mb-2 tracking-tight">{UI_TEXT.promoTitle[lang]}</h3>
                      <p className="text-white/90 text-sm font-medium">{UI_TEXT.promoDesc[lang]}</p>
                    </div>
                  </div>
                </div>

                {/* New Menu - Minimal Horizontal Scroll */}
                <div className="pl-6">
                  <div className="flex items-center justify-between pr-6 mb-5">
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{UI_TEXT.newMenu[lang]}</h3>
                    <ArrowRight size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex overflow-x-auto gap-4 pr-6 pb-4 -ml-2 pl-2 no-scrollbar">
                    {newItems.map(item => (
                      <div key={item.id} className="flex-shrink-0 w-48 group cursor-pointer">
                        <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden mb-4 bg-muted relative">
                           <img 
                             src={item.imageQuery} 
                             alt={getLocalizedName(item)} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                           />
                           <div className="absolute top-3 left-3 bg-card/90 backdrop-blur text-foreground text-[10px] font-bold px-2 py-1 rounded-full">
                             NEW
                           </div>
                        </div>
                        <h4 className="font-bold text-foreground text-lg leading-snug mb-1">{getLocalizedName(item)}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2 font-medium">{getLocalizedDesc(item)}</p>
                        <CurrencyDisplay amountVND={item.priceVND} className="font-semibold text-foreground" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Menu - Minimal List */}
                <div className="px-6">
                  <h3 className="text-xl font-bold tracking-tight text-foreground mb-5">{UI_TEXT.popularMenu[lang]}</h3>
                  <div className="grid grid-cols-1 gap-4">
                     {popularItems.map((item, index) => (
                       <div key={item.id} className="flex gap-4 items-center p-3 rounded-2xl hover:bg-muted/50 transition-colors group cursor-pointer">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative">
                             <img src={item.imageQuery} alt={getLocalizedName(item)} className="w-full h-full object-cover" />
                             <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg">
                               {index + 1}
                             </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground text-base mb-1 truncate">{getLocalizedName(item)}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{getLocalizedDesc(item)}</p>
                            <CurrencyDisplay amountVND={item.priceVND} className="font-semibold text-sm text-foreground" />
                          </div>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Brand Story - Clean Video Card */}
                <div className="px-6 pb-6">
                  <h3 className="text-xl font-bold tracking-tight text-foreground mb-5">{UI_TEXT.youtubeTitle[lang]}</h3>
                  <div className="relative rounded-3xl overflow-hidden bg-foreground aspect-video group cursor-pointer">
                     <img 
                       src="https://images.unsplash.com/photo-1694878982063-9c41c1d94f4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0dWJlJTIwdmlkZW8lMjB0aHVtYm5haWwlMjBjb29raW5nfGVufDF8fHx8MTc2NzE1NTE3M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                       alt="YouTube"
                       className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-60"
                     />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 text-white transition-transform group-hover:scale-110">
                           <Play className="fill-current ml-1" size={24} />
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                        <h4 className="text-white font-bold text-lg">Making the Perfect Broth</h4>
                        <span className="text-white/70 text-xs font-medium mt-1 inline-block">2 min watch</span>
                     </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};