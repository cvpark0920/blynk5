import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface LanguageSelectorProps {
  onComplete: () => void;
  restaurantName?: string | null;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onComplete, restaurantName }) => {
  
  useEffect(() => {
    // Splash screen duration - 1.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-slate-900">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
         <motion.div 
           initial={{ scale: 1.15 }}
           animate={{ scale: 1 }}
           transition={{ duration: 10, ease: "linear" }}
           className="w-full h-full"
         >
            <img 
              src="https://images.unsplash.com/photo-1765360773028-6affda725695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXN0YXVyYW50JTIwdGFibGUlMjBlbGVnYW50JTIwYXRtb3NwaGVyZXxlbnwxfHx8fDE3Njc1ODg2NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Luxury Restaurant Background" 
              className="w-full h-full object-cover"
            />
         </motion.div>
         {/* Gradient Overlay for Readability */}
         <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80" />
      </div>

      <div className="z-10 w-full px-6 flex flex-col items-center justify-center h-full relative">
        
        {/* Logo Section */}
        <motion.div 
          className="flex flex-col items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
           <motion.div 
             className="w-24 h-24 bg-black/30 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl mb-6 ring-1 ring-white/30"
             animate={{ rotate: [0, -5, 5, 0] }}
             transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
           >
             B
           </motion.div>
           <h1 className="text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
             {restaurantName || 'BLYNK'}
           </h1>
        </motion.div>
      </div>
    </div>
  );
};
