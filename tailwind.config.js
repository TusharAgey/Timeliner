/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-strong": "var(--panel-strong)",
        "panel-soft": "var(--panel-soft)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      boxShadow: {
        glow: "var(--card-shadow)",
      },
      backgroundColor: {
        "main-container": "var(--main-container-bg)",
      },
    },
  },
  plugins: [],
};
