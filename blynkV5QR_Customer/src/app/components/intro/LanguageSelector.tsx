import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface LanguageSelectorProps {
  onComplete: () => void;
  restaurantName?: string | null;
  splashImageUrl?: string | null;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onComplete, restaurantName, splashImageUrl }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Default image URL (only used when splashImageUrl is not provided)
  const defaultImageUrl = "https://images.unsplash.com/photo-1765360773028-6affda725695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXN0YXVyYW50JTIwdGFibGUlMjBlbGVnYW50JTIwYXRtb3NwaGVyZXxlbnwxfHx8fDE3Njc1ODg2NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  
  // Determine image URL: use splashImageUrl if available, otherwise use default
  const getImageUrl = () => {
    if (splashImageUrl && !imageError) {
      // If splashImageUrl is a relative path, make it absolute
      if (splashImageUrl.startsWith('/')) {
        return `${window.location.origin}${splashImageUrl}`;
      }
      return splashImageUrl;
    }
    // Only return default if no splashImageUrl was provided
    return splashImageUrl ? null : defaultImageUrl;
  };
  
  const imageUrl = getImageUrl();
  
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
         {imageUrl && (
           <motion.div 
             initial={{ scale: 1.15 }}
             animate={{ scale: 1 }}
             transition={{ duration: 10, ease: "linear" }}
             className="w-full h-full"
           >
              <img 
                src={imageUrl}
                alt="Restaurant Background" 
                className="w-full h-full object-cover"
                onLoad={() => {
                  setImageLoaded(true);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
           </motion.div>
         )}
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
             className="px-6 py-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center text-white text-xl font-bold shadow-2xl mb-6 ring-1 ring-white/30"
             animate={{ rotate: [0, -5, 5, 0] }}
             transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
           >
             QOODLE
           </motion.div>
           <h1 className="text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
             {restaurantName || 'QOODLE'}
           </h1>
        </motion.div>
      </div>
    </div>
  );
};
