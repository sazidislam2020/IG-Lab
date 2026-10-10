import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

// Theme color tokens
// Contrast (WCAG AA 4.5:1) verified 2026-10-04 — see docs/UI_UX_AUDIT.md §1.1:
//   dark  txtDim #8B8B93 on #09090B / #1C1C21 → 5.9 / 5.1
//   light txtDim #6B7280 on #FAFAFA / #F4F4F5 → 4.8 / 4.6
//   accent label #18181B on #FF6B2B → 6.1 (use instead of white)
export const themes = {
  dark: {
    bg: "#09090B",
    surface: "#18181B",
    card: "#1C1C21",
    border: "#27272A",
    borderLight: "#3F3F46",
    txt: "#FAFAFA",
    txtSec: "#A1A1AA",
    txtDim: "#8B8B93",
    accent: "#FF6B2B",
    accentInk: "#18181B",
    accentLink: "#FF6B2B", // on dark bg → 7.0:1
    // Semantic status colors (verify 4.5:1 on this theme's bg before reuse)
    success: "#3ECF8E",
    danger: "#F87171",
    info: "#38BDF8",
    warn: "#FFB238",
    violet: "#A78BFA",
  },
  light: {
    bg: "#FAFAFA",
    surface: "#FFFFFF",
    card: "#F4F4F5",
    border: "#E4E4E7",
    borderLight: "#D4D4D8",
    txt: "#18181B",
    txtSec: "#52525B",
    txtDim: "#6B7280",
    accent: "#FF6B2B",
    accentInk: "#18181B",
    accentLink: "#C2410C", // darker orange for light bg → 4.9:1
    // Semantic status colors — darkened for light bg (≥4.5:1 on #FAFAFA)
    success: "#047857",
    danger: "#B91C1C",
    info: "#0369A1",
    warn: "#B45309",
    violet: "#6D28D9",
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ignite-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ignite-theme", theme);
    } catch {}
    // Update body background
    document.body.style.background = themes[theme].bg;
    document.body.style.color = themes[theme].txt;
    // Update CSS custom properties on :root
    const t = themes[theme];
    document.documentElement.style.setProperty("--bg", t.bg);
    document.documentElement.style.setProperty("--surface", t.surface);
    document.documentElement.style.setProperty("--card", t.card);
    document.documentElement.style.setProperty("--border", t.border);
    document.documentElement.style.setProperty("--txt", t.txt);
    document.documentElement.style.setProperty("--txt-sec", t.txtSec);
    document.documentElement.style.setProperty("--txt-dim", t.txtDim);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
    colors: themes[theme],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
