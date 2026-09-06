import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

// Theme color tokens
export const themes = {
  dark: {
    bg: "#09090B",
    surface: "#18181B",
    card: "#1C1C21",
    border: "#27272A",
    borderLight: "#3F3F46",
    txt: "#FAFAFA",
    txtSec: "#A1A1AA",
    txtDim: "#71717A",
  },
  light: {
    bg: "#FAFAFA",
    surface: "#FFFFFF",
    card: "#F4F4F5",
    border: "#E4E4E7",
    borderLight: "#D4D4D8",
    txt: "#18181B",
    txtSec: "#52525B",
    txtDim: "#A1A1AA",
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
