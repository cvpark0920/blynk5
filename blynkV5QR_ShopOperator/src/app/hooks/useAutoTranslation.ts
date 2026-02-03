import { useState, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { Language } from '../context/LanguageContext';
import { toast } from 'sonner';

interface UseAutoTranslationOptions {
  sourceLanguage: Language;
  onTranslate?: (translations: Record<Language, string>) => void;
}

export function useAutoTranslation({ sourceLanguage, onTranslate }: UseAutoTranslationOptions) {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateToAllLanguages = useCallback(
    async (text: string): Promise<Record<Language, string> | null> => {
      if (!text || !text.trim()) {
        return null;
      }

      setIsTranslating(true);
      try {
        const result = await apiClient.translateToAllLanguages(text.trim(), sourceLanguage);

        if (result.success && result.data?.translations) {
          const translations = result.data.translations as Record<Language, string>;
          
          // 원본 언어도 포함하여 반환
          const allTranslations: Record<Language, string> = {
            ...translations,
            [sourceLanguage]: text.trim(),
          };

          // 콜백 호출
          if (onTranslate) {
            onTranslate(allTranslations);
          }

          return allTranslations;
        } else {
          toast.error('번역에 실패했습니다.');
          return null;
        }
      } catch (error) {
        console.error('Translation error:', error);
        toast.error('번역 중 오류가 발생했습니다.');
        return null;
      } finally {
        setIsTranslating(false);
      }
    },
    [sourceLanguage, onTranslate]
  );

  return {
    translateToAllLanguages,
    isTranslating,
  };
}
