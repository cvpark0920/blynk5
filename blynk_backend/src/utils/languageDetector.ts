const HANGUL_REGEX = /[\uAC00-\uD7A3]/;
const VIETNAMESE_REGEX =
  /[àáâãăạảấầẩẫậắằẳẵặèéêẹẻẽếềểễệìíĩỉịòóôõơớờởỡợọùúũủưứừửữựụỳýỹỷỵđ]/i;
const LATIN_REGEX = /[a-z]/i;

export type DetectedLanguage = 'ko' | 'vn' | 'en';

export function detectMessageLanguage(input: string): DetectedLanguage | null {
  const text = input?.trim();
  if (!text) return null;

  if (HANGUL_REGEX.test(text)) {
    return 'ko';
  }

  if (VIETNAMESE_REGEX.test(text)) {
    return 'vn';
  }

  if (LATIN_REGEX.test(text)) {
    return 'en';
  }

  return null;
}
