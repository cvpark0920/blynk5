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
    <div className="w-full overflow-x-auto py-3 px-4 flex gap-2 no-scrollbar bg-card/50 backdrop-blur-sm">
      {chips.length === 0 ? (
        <div className="text-sm text-muted-foreground px-4 py-2">
          상용구가 없습니다.
        </div>
      ) : (
        chips.map((chip) => {
          const IconComponent = (Icons as any)[chip.icon] || Icons.MessageCircle;
          return (
            <button
              key={chip.id}
              onClick={() => onChipClick(chip)}
              className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all whitespace-nowrap group hover:border-primary/30 hover:bg-primary/10"
            >
              <IconComponent size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors">
                {getLabel(chip)}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
};