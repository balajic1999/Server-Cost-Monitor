import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}", "./contexts/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "#FAFAF9",
                surface: "#FFFFFF",
                muted: "#F5F5F4",
                "muted-strong": "#E7E5E4",
                border: "#E7E5E4",
                "border-strong": "#D6D3D1",
                foreground: "#1C1917",
                "muted-foreground": "#57534E",
                "subtle-foreground": "#A8A29E",
                accent: "#0F766E",
                "accent-hover": "#115E59",
                "accent-soft": "#CCFBF1",
                success: "#15803D",
                warning: "#B45309",
                danger: "#B91C1C"
            },
            fontFamily: {
                sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
                serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"]
            }
        }
    },
    plugins: []
};

export default config;
