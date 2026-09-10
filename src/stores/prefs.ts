import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

type Theme = "light" | "dark";

type Prefs = {
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  hydrate: () => void;
};

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyLang(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "ar" ? "ar" : "en";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export const usePrefs = create<Prefs>((set) => ({
  lang: "en",
  theme: "light",
  setLang: (lang) => {
    localStorage.setItem("qads.lang", lang);
    applyLang(lang);
    set({ lang });
  },
  setTheme: (theme) => {
    localStorage.setItem("qads.theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  hydrate: () => {
    const lang = (localStorage.getItem("qads.lang") as Lang) || "en";
    const theme = (localStorage.getItem("qads.theme") as Theme) || "light";
    applyLang(lang);
    applyTheme(theme);
    set({ lang, theme });
  },
}));
