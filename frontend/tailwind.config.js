/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAF8",
        surface: "#FFFFFF",
        subtle: "#F4F4F1",
        border: "#E7E7E2",
        navy: {
          50: "#F0F4F8",
          100: "#D9E2EC",
          600: "#1E3A5F",
          700: "#162D4A",
          800: "#0F172A",
          900: "#0A101D",
          950: "#050810",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        recall: {
          light: "#FEF2F2",
          border: "#FECACA",
          badge: "#FEE2E2",
          text: "#991B1B",
          accent: "#DC2626",
          dark: "#7F1D1D",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'urgent': '0 0 0 1px rgba(220, 38, 38, 0.2), 0 4px 15px rgba(220, 38, 38, 0.1)',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
