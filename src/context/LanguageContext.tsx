/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {getLocaleByLanguage, isAppLanguage,LANGUAGE_STORAGE_KEY,
  type AppLanguage,
  type TranslationKey,
} from "@/lib/translations";
import i18n from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  locale: string;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return "uz";

    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(saved)) return saved;

    if (isAppLanguage(i18n.language)) return i18n.language;

    return "uz";
  });

  const locale = useMemo(() => getLocaleByLanguage(language), [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = locale;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LANGUAGE_STORAGE_KEY) return;
      const next = e.newValue;
      if (isAppLanguage(next)) {
        setLanguageState(next);
        if (i18n.language !== next) {
          void i18n.changeLanguage(next);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onLanguageChanged = (nextLanguage: string) => {
      if (isAppLanguage(nextLanguage)) {
        setLanguageState(nextLanguage);
      }
    };

    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    if (i18n.language !== next) {
      void i18n.changeLanguage(next);
    }
  };

  const t: LanguageContextValue["t"] = (key, vars) =>
    i18n.t(key, vars as Record<string, string | number | undefined>) as string;

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useAppLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useAppLanguage must be used within LanguageProvider");
  return ctx;
};

export const useAppLocale = () => useAppLanguage().locale;

