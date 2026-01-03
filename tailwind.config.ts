import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00C2A0",
      },
      fontFamily: {
        youn310: ["var(--font-youn310)"],
        youn320: ["var(--font-youn320)"],
        youn330: ["var(--font-youn330)"],
        youn340: ["var(--font-youn340)"],
        youn350: ["var(--font-youn350)"],
        Jalnan2: ["var(--font-Jalnan2)"],
      },
    },
  },
  plugins: [],
};

export default config;
