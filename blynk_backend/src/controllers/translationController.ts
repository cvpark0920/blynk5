import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
  detectLanguageWithDeepL,
  translateText,
} from '../services/translationService';

type SupportedLanguage = 'ko' | 'vn' | 'en' | 'ru' | 'zh';

/**
 * 언어 감지
 */
export const detectLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw createError('Text is required', 400);
    }

    const detectedLanguage = await detectLanguageWithDeepL(text);

    if (!detectedLanguage) {
      res.json({
        success: false,
        error: { message: 'Failed to detect language' },
      });
      return;
    }

    res.json({ success: true, data: { language: detectedLanguage } });
  } catch (error) {
    next(error);
  }
};

/**
 * 단일 텍스트 번역
 */
export const translateSingle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { text, targetLang, sourceLang } = req.body;

    if (!text || typeof text !== 'string') {
      throw createError('Text is required', 400);
    }

    if (!targetLang || typeof targetLang !== 'string') {
      throw createError('Target language is required', 400);
    }

    const validLanguages: SupportedLanguage[] = ['ko', 'vn', 'en', 'ru', 'zh'];
    if (!validLanguages.includes(targetLang as SupportedLanguage)) {
      throw createError('Invalid target language', 400);
    }

    if (sourceLang && !validLanguages.includes(sourceLang as SupportedLanguage)) {
      throw createError('Invalid source language', 400);
    }

    const translated = await translateText(
      text,
      targetLang as SupportedLanguage,
      sourceLang as SupportedLanguage | undefined
    );

    if (!translated) {
      res.json({
        success: false,
        error: { message: 'Failed to translate text' },
      });
      return;
    }

    res.json({ success: true, data: { translated } });
  } catch (error) {
    next(error);
  }
};

/**
 * 모든 언어로 번역
 */
export const translateToAllLanguages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { text, sourceLang } = req.body;

    if (!text || typeof text !== 'string') {
      throw createError('Text is required', 400);
    }

    if (!sourceLang || typeof sourceLang !== 'string') {
      throw createError('Source language is required', 400);
    }

    const validLanguages: SupportedLanguage[] = ['ko', 'vn', 'en', 'ru', 'zh'];
    if (!validLanguages.includes(sourceLang as SupportedLanguage)) {
      throw createError('Invalid source language', 400);
    }

    const targetLanguages: SupportedLanguage[] = ['ko', 'vn', 'en', 'ru', 'zh'];
    const translations: Record<string, string> = {};

    // 모든 언어로 병렬 번역
    const translationPromises = targetLanguages
      .filter((lang) => lang !== sourceLang)
      .map(async (lang) => {
        const translated = await translateText(
          text,
          lang,
          sourceLang as SupportedLanguage
        );
        return { lang, translated };
      });

    const results = await Promise.all(translationPromises);

    // 원본 언어도 포함
    translations[sourceLang] = text;

    // 번역 결과 추가
    results.forEach(({ lang, translated }) => {
      if (translated) {
        translations[lang] = translated;
      }
    });

    res.json({ success: true, data: { translations } });
  } catch (error) {
    next(error);
  }
};
