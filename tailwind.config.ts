import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          faint: "#64748b",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8fafc",
          sunken: "#f1f5f9",
        },
        brand: {
          DEFAULT: "#0d5c46",
          dark: "#083d2f",
          light: "#e6f2ee",
        },
        line: "#e2e8f0",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
