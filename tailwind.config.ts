/**
 * Yenomi ID — Light/Warm Premium Tailwind contract.
 *
 * Tailwind is not the runtime source of truth yet; app/canonical.css +
 * app/design-tokens.css remain authoritative. This config mirrors the same
 * semantic vocabulary so new Tailwind-powered surfaces cannot invent a second
 * color system during incremental migration.
 */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--surface-base, #F9F8F6)",
        surface: {
          DEFAULT: "var(--surface-card, #FFFFFF)",
          soft: "var(--surface-soft, #F2EFE9)",
          elevated: "var(--surface-card, #FFFFFF)",
        },
        border: {
          DEFAULT: "var(--border-subdued, #E6E2D8)",
          interactive: "var(--border-interactive, #D8D2C4)",
        },
        brand: {
          DEFAULT: "var(--brand-gold, #A37B2C)",
          deep: "var(--brand-gold-deep, #9E7728)",
          hover: "var(--brand-gold-hover, #896420)",
          soft: "var(--brand-gold-soft, #F6F1E5)",
        },
        text: {
          primary: "var(--warm-text-primary, #1A1918)",
          secondary: "var(--warm-text-secondary, #68645D)",
          muted: "var(--warm-muted, #78716C)",
          inverse: "#FFFFFF",
        },
        success: "var(--warm-success, #059669)",
        warning: "var(--warm-warning, #D97706)",
        danger: "var(--warm-danger, #DC2626)",
      },
      borderRadius: {
        xs: "var(--radius-xs, 6px)",
        sm: "var(--radius-sm, 10px)",
        md: "var(--radius-md, 14px)",
        lg: "var(--radius-lg, 20px)",
        xl: "var(--radius-xl, 28px)",
      },
      boxShadow: {
        card: "var(--shadow-xs, 0 1px 2px rgba(40,34,28,.06))",
        soft: "var(--shadow-sm, 0 2px 8px rgba(40,34,28,.04))",
        overlay: "var(--shadow-md, 0 18px 44px rgba(40,34,28,.12))",
      },
      transitionDuration: {
        fast: "140ms",
        standard: "220ms",
        emphasis: "380ms",
      },
      screens: {
        xs: "375px",
        mobile: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
