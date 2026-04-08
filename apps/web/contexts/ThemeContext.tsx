"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    toggleTheme: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem("cloudpulse-theme") as Theme | null;
        if (stored && (stored === "dark" || stored === "light")) {
            setTheme(stored);
            applyTheme(stored);
        }
    }, []);

    function applyTheme(t: Theme) {
        const html = document.documentElement;
        if (t === "dark") {
            html.classList.add("dark");
            html.classList.remove("light");
        } else {
            html.classList.add("light");
            html.classList.remove("dark");
        }
    }

    function toggleTheme() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
        localStorage.setItem("cloudpulse-theme", next);
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
