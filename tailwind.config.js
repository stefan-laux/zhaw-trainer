/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zhaw: {
          DEFAULT: "#1E3A5F",
          dark: "#0E1B2E",
          light: "#C6A15B",
          tint: "#EFE6D2",
        },
        gold: {
          DEFAULT: "#C6A15B",
          light: "#DCC089",
          dark: "#9A7B42",
        },
        parchment: "#EDE4D3",
        ink: {
          DEFAULT: "#212529",
          soft: "#333333",
          mute: "#6C757D",
        },
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        glow: "0 0 40px -14px rgba(198,161,91,0.45)",
        card: "0 10px 40px -12px rgba(0,0,0,0.5)",
      },
      keyframes: {
        aurora: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        aurora: "aurora 18s ease infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
