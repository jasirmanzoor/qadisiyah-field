import { create } from "zustand";
import type { Lang } from "@/lib/i18n";
import type { MarketId } from "@/lib/types";

type Theme = "light" | "dark";

type Prefs = {
  lang: Lang;
  theme: Theme;
  market: MarketId;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setMarket: (m: MarketId) => void;
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

function readMarket(): MarketId {
  const v = localStorage.getItem("qads.market");
  return v === "shifa" ? "shifa" : "qadisiyah";
}

export const usePrefs = create<Prefs>((set) => ({
  lang: "en",
  theme: "light",
  market: "qadisiyah",
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
  setMarket: (market) => {
    localStorage.setItem("qads.market", market);
    set({ market });
  },
  hydrate: () => {
    const lang = (localStorage.getItem("qads.lang") as Lang) || "en";
    const theme = (localStorage.getItem("qads.theme") as Theme) || "light";
    const market = readMarket();
    applyLang(lang);
    applyTheme(theme);
    set({ lang, theme, market });
  },
}));
