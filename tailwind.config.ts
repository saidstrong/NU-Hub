import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wire: {
          950: "#0B0F14",
          900: "#111827",
          800: "#151D2B",
          700: "#253046",
          600: "#3A465E",
          300: "#9CA3AF",
          200: "#D1D5DB",
          100: "#F3F4F6"
        },
        accent: "#4F7CFF",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      }
    },
  },
  plugins: [],
};

export default config;
