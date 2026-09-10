/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f4f6fa",
        panel: "#ffffff",
        panel2: "#eef1f6",
        border: "#dde3ec",
        accentGreen: "#059669",
        accentBlue: "#2563eb",
        accentOrange: "#c2650c",
        accentRed: "#dc2626",
        cyan: "#0e7490",
        violet: "#6d28d9",
      },
      boxShadow: {
        glow: "0 1px 2px rgba(15,23,42,0.06), 0 8px 20px rgba(15,23,42,0.06)",
        glowStrong: "0 4px 14px rgba(14,116,144,0.18)",
      },
    },
  },
  plugins: [],
};
