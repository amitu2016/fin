import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: "#0d1117",
        panel: "#1a1a2e",
        border: "#2a2a4a",
        yellow: { accent: "#ecad0a" },
        blue: { primary: "#209dd7" },
        purple: { btn: "#753991" },
      },
    },
  },
  plugins: [],
};
export default config;
