/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11203a",
        fog: "#eef3f8",
        mist: "#dbe6f1",
        sunrise: "#f97316",
        tide: "#0f766e",
        coral: "#ef4444",
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 32, 58, 0.14)",
      },
    },
  },
  plugins: [],
};

