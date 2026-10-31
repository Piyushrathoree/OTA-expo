import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { ja } from "./locales/ja";

const deviceLanguage = getLocales()[0]?.languageCode === "ja" ? "ja" : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ja: { translation: ja } },
  lng: deviceLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export const dateLocale = () => (i18n.language === "ja" ? "ja-JP" : "en-US");

export default i18n;
