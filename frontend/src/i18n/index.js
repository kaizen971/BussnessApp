import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';

// Traduction « style gettext » : la phrase française sert de clé.
//   t('Dépenses')                      -> 'Expenses' en anglais
//   t('Bonjour {name}', { name })      -> interpolation
// Toute phrase absente du dictionnaire retombe sur le français : rien ne casse.

export const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR' },
  { code: 'en', label: 'English', short: 'EN', locale: 'en-US' },
];

const DICTIONARIES = { en };
const STORAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'fr';

let currentLanguage = DEFAULT_LANGUAGE;

const interpolate = (text, vars) => {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match));
};

export const t = (text, vars) => {
  if (typeof text !== 'string') return text;
  const dict = DICTIONARIES[currentLanguage];
  const translated = dict && Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text;
  return interpolate(translated, vars);
};

export const getLanguage = () => currentLanguage;
export const getLocale = () => (LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0]).locale;

const detectDeviceLanguage = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    if (locale.toLowerCase().startsWith('en')) return 'en';
  } catch (e) {
    // Intl indisponible : on garde le français
  }
  return DEFAULT_LANGUAGE;
};

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  locale: 'fr-FR',
  setLanguage: () => {},
  t,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(currentLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let lang = null;
      try {
        lang = await AsyncStorage.getItem(STORAGE_KEY);
      } catch (e) {
        lang = null;
      }
      if (!LANGUAGES.some((l) => l.code === lang)) lang = detectDeviceLanguage();
      if (cancelled) return;
      currentLanguage = lang;
      setLanguageState(lang);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (!LANGUAGES.some((l) => l.code === lang)) return;
    currentLanguage = lang;
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // préférence non persistée : sans gravité
    }
  }, []);

  // `t` change d'identité avec la langue pour que les useMemo/useCallback qui en dépendent se recalculent
  const value = useMemo(() => ({
    language,
    locale: getLocale(),
    setLanguage,
    t: (text, vars) => t(text, vars),
  }), [language, setLanguage]);

  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useI18n = () => useContext(LanguageContext);

// À appeler dans chaque écran : force le re-rendu quand la langue change
export const useLanguage = () => useContext(LanguageContext).language;
