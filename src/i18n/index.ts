import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './tr.json';
import en from './en.json';

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  fallbackLng: 'en',
  supportedLngs: ['tr', 'en'],
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'llmcalc:lang',
  },
});

document.documentElement.lang = i18n.resolvedLanguage || 'en';
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
