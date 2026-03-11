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
          950: "#0B0D10",
          900: "#11151A",
          800: "#171C22",
          700: "#262C34",
          600: "#303743",
          300: "#8F98A3",
          200: "#C5CBD3",
          100: "#F3F5F7"
        },
        accent: "#5B8CFF"
      }
    },
  },
  plugins: [],
};

export default config;
