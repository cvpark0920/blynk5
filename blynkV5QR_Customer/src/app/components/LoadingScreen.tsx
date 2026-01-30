import React from 'react';
import { motion } from 'motion/react';
import { getTranslation } from '../i18n/translations';
import type { LangType } from '../i18n/translations';

interface LoadingScreenProps {
  lang?: LangType;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ lang }) => {
  const loadingText = lang ? getTranslation('common.loading', lang) : '로딩 중...';
  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="px-5 py-2 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-base font-bold"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          QOODLE
        </motion.div>
        <motion.p
          className="text-gray-600 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {loadingText}
        </motion.p>
      </div>
    </div>
  );
};
