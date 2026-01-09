import React from 'react';
import { QuickChip } from '../../types';
import * as Icons from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTranslation } from '../../i18n/translations';

interface QuickActionsProps {
  chips: QuickChip[];
  onChipClick: (chip: QuickChip) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ chips, onChipClick }) => {
  const { lang } = useLanguage();

  const getLabel = (chip: QuickChip): string => {
    if (lang === 'ko') return chip.labelKO;
    if (lang === 'vn') return chip.labelVN;
    return chip.labelEN || chip.labelKO;
  };

  return (
    <div className="w-full overflow-x-auto py-3 px-4 flex gap-2 no-scrollbar bg-white/50 backdrop-blur-sm">
      {chips.map((chip) => {
        const IconComponent = (Icons as any)[chip.icon] || Icons.MessageCircle;
        return (
          <button
            key={chip.id}
            onClick={() => onChipClick(chip)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 active:scale-95 transition-all whitespace-nowrap group hover:border-blue-200 hover:bg-blue-50"
          >
            <IconComponent size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
              {getLabel(chip)}
            </span>
          </button>
        );
      })}

      {/* Extra Actions - 다국어화 적용 */}
      <button
        onClick={() => onChipClick({
          id: 'extra-wifi',
          icon: 'Wifi',
          labelKO: '와이파이',
          labelVN: 'Wi-Fi',
          labelEN: 'Wi-Fi',
          action: 'message',
          messageKO: '와이파이 비밀번호 알려주세요.',
          messageVN: 'Cho tôi xin mật khẩu Wi-Fi.',
          messageEN: 'Can I have the Wi-Fi password?'
        })}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 active:scale-95 transition-all whitespace-nowrap group hover:border-blue-200 hover:bg-blue-50"
      >
        <Icons.Wifi size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
          {getTranslation('quickActions.wifi', lang)}
        </span>
      </button>

      <button
        onClick={() => onChipClick({
          id: 'extra-toilet',
          icon: 'MapPin',
          labelKO: '화장실',
          labelVN: 'Nhà vệ sinh',
          labelEN: 'Toilet',
          action: 'message',
          messageKO: '화장실이 어디에 있나요?',
          messageVN: 'Nhà vệ sinh ở đâu?',
          messageEN: 'Where is the restroom?'
        })}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 active:scale-95 transition-all whitespace-nowrap group hover:border-blue-200 hover:bg-blue-50"
      >
        <Icons.MapPin size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
          {getTranslation('quickActions.toilet', lang)}
        </span>
      </button>

      <button
        onClick={() => onChipClick({
          id: 'extra-tissue',
          icon: 'Scroll',
          labelKO: '휴지',
          labelVN: 'Khăn giấy',
          labelEN: 'Tissue',
          action: 'message',
          messageKO: '휴지 좀 주시겠어요?',
          messageVN: 'Cho tôi xin ít khăn giấy.',
          messageEN: 'Can I have some tissue?'
        })}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 active:scale-95 transition-all whitespace-nowrap group hover:border-blue-200 hover:bg-blue-50"
      >
        <Icons.Scroll size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
          {getTranslation('quickActions.tissue', lang)}
        </span>
      </button>

      <button
        onClick={() => onChipClick({
          id: 'extra-bill',
          icon: 'Receipt',
          labelKO: '계산서',
          labelVN: 'Hóa đơn',
          labelEN: 'Bill',
          action: 'message',
          messageKO: '계산서 주세요.',
          messageVN: 'Làm ơn tính tiền.',
          messageEN: 'Can I have the bill?'
        })}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 active:scale-95 transition-all whitespace-nowrap group hover:border-blue-200 hover:bg-blue-50"
      >
        <Icons.Receipt size={16} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
          {getTranslation('quickActions.bill', lang)}
        </span>
      </button>
    </div>
  );
};