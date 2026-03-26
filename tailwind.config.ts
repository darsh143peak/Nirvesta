import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#141313",
        surface: "#141313",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353434",
        "surface-bright": "#3a3939",
        "surface-variant": "#353434",
        primary: "#ffffff",
        "on-primary": "#1a1c1c",
        "on-primary-container": "#000000",
        secondary: "#ffb95f",
        tertiary: "#6ffbbe",
        "on-tertiary": "#002113",
        outline: "#919191",
        "outline-variant": "#474747",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#c6c6c6",
        error: "#ffb4ab"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(255,255,255,0.14)",
        emerald: "0 0 40px rgba(111,251,190,0.2)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      animation: {
        ticker: "ticker 30s linear infinite",
        pulseSoft: "pulseSoft 3s ease-in-out infinite"
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.35" }
        }
      }
    }
  },
  plugins: []
};

export default config;
