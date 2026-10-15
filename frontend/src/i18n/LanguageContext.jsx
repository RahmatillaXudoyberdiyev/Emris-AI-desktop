import React, { createContext, useContext, useState, useEffect } from "react";
import uz from "../locales/uz.json";
import en from "../locales/en.json";
import ru from "../locales/ru.json";

const translations = { uz, en, ru };

const LanguageContext = createContext({
  language: "uz",
  setLanguage: () => {},
  t: (keyPath, fallback = "") => fallback
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem("emris_language") || "uz";
    } catch {
      return "uz";
    }
  });

  const setLanguage = (lang) => {
    try {
      if (translations[lang]) {
        setLanguageState(lang);
        localStorage.setItem("emris_language", lang);
        if (window.pywebview?.api?.set_setting) {
          window.pywebview.api.set_setting("language", lang);
        }
      }
    } catch (err) {
      console.error("[i18n] Error setting language:", err);
    }
  };

  const t = (keyPath, fallback = "") => {
    try {
      const keys = keyPath.split(".");
      let current = translations[language] || translations.uz;
      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          return fallback || keyPath;
        }
      }
      return typeof current === "string" ? current : fallback || keyPath;
    } catch (err) {
      console.error("[i18n] Translation lookup error:", err);
      return fallback || keyPath;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
