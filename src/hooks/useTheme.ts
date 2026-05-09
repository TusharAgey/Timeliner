import { useCallback, useEffect, useState } from "react";
import type { ThemeId } from "../themes/themeConfig";
import { DEFAULT_THEME } from "../themes/themeConfig";

const STORAGE_KEY = "timeliner-theme";

const loadTheme = (): ThemeId => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isThemeId(saved)) return saved;
  } catch {}
  return DEFAULT_THEME;
};

const isThemeId = (value: string): value is ThemeId =>
  [
    "midnight",
    "material-dark",
    "material-light",
    "apple-light",
    "apple-space-gray",
    "nord",
  ].includes(value);

const applyTheme = (theme: ThemeId) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeId>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const toggleDarkLight = useCallback(() => {
    const darkThemes: ThemeId[] = [
      "midnight",
      "material-dark",
      "apple-space-gray",
      "nord",
    ];
    const lightThemes: ThemeId[] = ["material-light", "apple-light"];
    const isDark = darkThemes.includes(theme);
    if (isDark) {
      setTheme(theme === "midnight" ? "apple-light" : "material-light");
    } else {
      setTheme(theme === "apple-light" ? "midnight" : "material-dark");
    }
  }, [theme, setTheme]);

  return { theme, setTheme, toggleDarkLight };
};
