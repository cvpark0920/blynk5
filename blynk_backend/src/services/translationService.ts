type SupportedLanguage = 'ko' | 'vn' | 'en' | 'ru' | 'zh';

const DEEPL_FREE_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';

const toDeepLLang = (lang: SupportedLanguage) => {
  switch (lang) {
    case 'ko':
      return 'KO';
    case 'vn':
      return 'VI';
    case 'ru':
      return 'RU';
    case 'zh':
      return 'ZH';
    case 'en':
    default:
      return 'EN';
  }
};

const fromDeepLLang = (lang: string | undefined): SupportedLanguage | null => {
  switch (lang) {
    case 'KO':
      return 'ko';
    case 'VI':
      return 'vn';
    case 'RU':
      return 'ru';
    case 'ZH':
      return 'zh';
    case 'EN':
      return 'en';
    default:
      return null;
  }
};

const resolveEndpoint = (authKey: string) =>
  authKey.endsWith(':fx') ? DEEPL_FREE_ENDPOINT : DEEPL_PRO_ENDPOINT;

export async function detectLanguageWithDeepL(text: string): Promise<SupportedLanguage | null> {
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) return null;

  const trimmed = text?.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams();
  params.append('text', trimmed);
  params.append('target_lang', 'EN');

  const response = await fetch(resolveEndpoint(authKey), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    translations?: Array<{ detected_source_language?: string }>;
  };
  return fromDeepLLang(payload.translations?.[0]?.detected_source_language);
}

export async function translateText(
  text: string,
  target: SupportedLanguage,
  source?: SupportedLanguage
): Promise<string | null> {
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) return null;

  const trimmed = text?.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams();
  params.append('text', trimmed);
  params.append('target_lang', toDeepLLang(target));
  if (source) {
    params.append('source_lang', toDeepLLang(source));
  }

  const response = await fetch(resolveEndpoint(authKey), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    translations?: Array<{ text?: string }>;
  };
  const translated = payload.translations?.[0]?.text?.trim();
  return translated || null;
}
