import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
};

const browserLang = (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).languages?.[0])) || 'zh-CN';
const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null;
const defaultLang = (savedLang || browserLang).startsWith('zh') ? 'zh-CN' : 'en-US';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;