"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light" });

export function useTheme() {
  return useContext(ThemeContext);
}

/** Single light theme — keeps provider for compatibility with any useTheme() callers */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}
