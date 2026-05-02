import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import de from '../locales/de.json';
import ru from '../locales/ru.json';
import he from '../locales/he.json';
import zh from '../locales/zh.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import tr from '../locales/tr.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  es: { translation: es },
  zh: { translation: zh },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
  he: { translation: he },
  tr: { translation: tr },
};

// eslint-disable-next-line import/no-named-as-default-member
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
