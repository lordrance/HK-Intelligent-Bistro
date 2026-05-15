import type { Config } from "tailwindcss";

/** Aligns with src/theme/tokens.ts */
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bistro: {
          bg: "#05060a",
          "bg-elevated": "#0b0d14",
          panel: "#0c0e14",
          text: "#fdf8ef",
          muted: "rgba(255,255,255,0.55)",
          gold: "#d4af65",
          "gold-soft": "#f5ecd4",
          "gold-dim": "rgba(233,213,161,0.85)",
          line: "rgba(255,255,255,0.1)",
          glass: "rgba(255,255,255,0.06)",
        },
      },
      borderRadius: {
        bistro: "20px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
