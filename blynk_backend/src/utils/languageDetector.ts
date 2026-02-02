const HANGUL_REGEX = /[\uAC00-\uD7A3]/;
const VIETNAMESE_REGEX =
  /[àáâãăạảấầẩẫậắằẳẵặèéêẹẻẽếềểễệìíĩỉịòóôõơớờởỡợọùúũủưứừửữựụỳýỹỷỵđ]/i;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const CHINESE_REGEX = /[\u4E00-\u9FFF]/;
const LATIN_REGEX = /[a-z]/i;

export type DetectedLanguage = 'ko' | 'vn' | 'en' | 'ru' | 'zh';

export function detectMessageLanguage(input: string): DetectedLanguage | null {
  const text = input?.trim();
  if (!text) return null;

  if (HANGUL_REGEX.test(text)) {
    return 'ko';
  }

  if (VIETNAMESE_REGEX.test(text)) {
    return 'vn';
  }

  if (CHINESE_REGEX.test(text)) {
    return 'zh';
  }

  if (CYRILLIC_REGEX.test(text)) {
    return 'ru';
  }

  if (LATIN_REGEX.test(text)) {
    return 'en';
  }

  return null;
}
