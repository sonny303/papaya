/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        papaya: "var(--papaya)",
        coral: "var(--coral)",
        action: "var(--action)",
        "action-hover": "var(--action-hover)",
        leaf: "var(--leaf)",
        "leaf-soft": "var(--leaf-soft)",
        peach: "var(--peach)",
        butter: "var(--butter)",
        line: "var(--line)",
        control: "var(--control)",
        error: "var(--error)",
        "error-soft": "var(--error-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        control: "10px",
        card: "16px",
        feature: "24px",
      },
    },
  },
  plugins: [],
};
