/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        primary: "#7B5AA6",
        accent: "#F37321",
        textPrimary: "#1E293B",
        textSecondary: "#64748B",
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      borderRadius: {
        card: "12px",
        button: "10px",
        input: "10px",
      },
    },
  },
  plugins: [],
}