import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LangType } from './translations';

interface LanguageContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangType>(() => {
    // 초기값: localStorage 또는 브라우저 언어
    const savedLang = localStorage.getItem('blynk_user_lang') as LangType;
    if (savedLang && ['ko', 'vn', 'en', 'zh', 'ru'].includes(savedLang)) {
      return savedLang;
    }
    
    // 브라우저 언어 감지
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('ko')) return 'ko';
    if (browserLang.includes('vi')) return 'vn';
    if (browserLang.includes('zh')) return 'zh';
    if (browserLang.includes('ru')) return 'ru';
    return 'en';
  });

  const setLang = (newLang: LangType) => {
    setLangState(newLang);
    localStorage.setItem('blynk_user_lang', newLang);
  };

  // localStorage 변경 감지 (다른 탭에서 변경 시)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blynk_user_lang' && e.newValue) {
        const newLang = e.newValue as LangType;
        if (['ko', 'vn', 'en', 'zh', 'ru'].includes(newLang)) {
          setLangState(newLang);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
