"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "cartograph-theme";

function applyThemeToDOM(targetTheme: ThemePreference): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  root.dataset.theme = targetTheme;

  let isDark = false;
  if (targetTheme === "dark") {
    isDark = true;
  } else if (targetTheme === "light") {
    isDark = false;
  } else if (typeof window !== "undefined") {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    return "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    return "light";
  }
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return initialTheme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
      if (stored === "system" || stored === "light" || stored === "dark") {
        return stored;
      }
    } catch {
      // ignore
    }
    return initialTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    return initialTheme === "light" ? "light" : "dark";
  });

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      document.cookie = `${THEME_STORAGE_KEY}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // storage unavailable
    }
    const resolved = applyThemeToDOM(newTheme);
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme === "system") {
        const nextResolved = applyThemeToDOM("system");
        setResolvedTheme(nextResolved);
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
