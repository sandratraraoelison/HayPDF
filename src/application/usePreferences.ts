import { useEffect, useState } from "react";
import { translations } from "./translations";
export type Language = "fr" | "en";
export type Theme = "light" | "dark";
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences still work without storage. */
  }
}
export function usePreferences() {
  const [language, setLanguage] = useState<Language>(() =>
    stored("haypdf.language") === "en" ? "en" : "fr",
  );
  const [theme, setTheme] = useState<Theme>(() =>
    stored("haypdf.theme") === "light" ? "light" : "dark",
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "fr" ? "HayPDF — Atelier PDF" : "HayPDF — PDF Studio";
    persist("haypdf.language", language);
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persist("haypdf.theme", theme);
  }, [theme]);
  const t = (text: string) =>
    language === "fr" ? text : (translations[text] ?? text);
  return { language, setLanguage, theme, setTheme, t };
}
