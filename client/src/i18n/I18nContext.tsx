import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, LANGUAGES, isRtl, type Lang, type TranslationKey } from './translations';
import { CONSENT_EVENT, readConsent, setPreference } from './consent';

const STORAGE_KEY = 'scholarflow_lang';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Look up a UI string; `vars` replaces `{name}` placeholders. Falls back to English, then the key. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations.en[key] ?? key,
});

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = LANGUAGES.find((l) => l.code === saved);
    if (match) return match.code;
  } catch {
    /* ignore */
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase().split('-')[0] : '';
  return LANGUAGES.find((l) => l.code === browser)?.code ?? 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
    setPreference(STORAGE_KEY, lang);
  }, [lang]);

  // If the visitor later declines preference storage, drop the saved language.
  useEffect(() => {
    const onConsent = () => setPreference(STORAGE_KEY, lang);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback<I18nContextType['t']>(
    (key, vars) => {
      let text = translations[lang][key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
      return text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

// Re-exported so callers import i18n pieces from one place.
export { readConsent };
