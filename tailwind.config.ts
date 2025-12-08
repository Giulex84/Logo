import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        piPurple: "#6c52ff",
        piGold: "#f5c042"
      },
      boxShadow: {
        card: "0 10px 40px rgba(0, 0, 0, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
