import React from 'react';
import { motion } from 'motion/react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-3xl font-bold"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          B
        </motion.div>
        <motion.p
          className="text-gray-600 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          로딩 중...
        </motion.p>
      </div>
    </div>
  );
};
