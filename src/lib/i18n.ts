import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import {
  APP_LANGUAGES,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  translations,
  type AppLanguage,
} from "@/lib/translations";

type NamespaceName =
  | "translation"
  | "common"
  | "layout"
  | "dashboard"
  | "director-dashboard"
  | "director-stats"
  | "director-table"
  | "director-filters"
  | "director-finance"
  | "director-tickets"
  | "admin-dashboard"
  | "student-dashboard"
  | "parent-dashboard"
  | "teacher-dashboard";

type I18nResource = Partial<Record<NamespaceName, Record<string, unknown>>>;

const NS_COMMON_PREFIXES = [
  "search.",
  "notifications.",
  "preferences.",
  "account.",
  "navigation.",
  "auth.",
  "user.",
  "subscription.",
];

const NS_LAYOUT_PREFIXES = [
  "parent.",
  "teacher.",
  "student.",
  "director.",
  "schoolAdmin.",
  "admin.",
  "common.sections",
];

const NS_DASHBOARD_PREFIXES = ["dashboard."];

const pickNamespaceEntries = (source: Record<string, string>, prefixes: string[]) => {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix))),
  );
};

const resources = APP_LANGUAGES.reduce<Record<AppLanguage, I18nResource>>((acc, language) => {
  const full = translations[language];

  acc[language] = {
    translation: full,
    common: pickNamespaceEntries(full, NS_COMMON_PREFIXES),
    layout: pickNamespaceEntries(full, NS_LAYOUT_PREFIXES),
    dashboard: pickNamespaceEntries(full, NS_DASHBOARD_PREFIXES),
  };

  return acc;
}, {} as Record<AppLanguage, I18nResource>);

const getInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return "uz";
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isAppLanguage(saved)) return saved;
  return "uz";
};

if (!i18n.isInitialized) {
  void i18n
    .use(
      resourcesToBackend((language: string, namespace: string) =>
        import(`../locales/${language}/${namespace}.json`),
      ),
    )
    .use(initReactI18next)
    .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: [...APP_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    defaultNS: "translation",
    ns: [
      "translation",
      "common",
      "layout",
      "dashboard",
      "director-dashboard",
      "director-stats",
      "director-table",
      "director-filters",
      "director-finance",
      "director-tickets",
      "admin-dashboard",
      "student-dashboard",
      "parent-dashboard",
      "teacher-dashboard",
    ],
    partialBundledLanguages: true,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
