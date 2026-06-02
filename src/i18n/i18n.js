import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import translationEN from "./locales/en.json";
import translationZH from "./locales/zh.json";
import translationVI from "./locales/vi.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: translationEN
      },
      zh: {
        translation: translationZH
      },
      vi: {
        translation: translationVI
      }
    },
    lng: 'vi',
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export function translate(key) {
  return i18n.t(key);
}

export default i18n;
