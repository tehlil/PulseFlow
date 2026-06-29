/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Force dark class since we want a Dark Professional Theme
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0A0A0C', // Deep obsidian dark background
          card: '#121215',       // Slightly lighter obsidian for cards
          hover: '#18181C',      // Hover states on lists
        },
        border: {
          DEFAULT: '#1F1F24', // Subtle border color for grid alignment
          accent: '#2F2F37',  // Stronger borders for focused items
        },
        healthcare: {
          cyan: '#06B6D4',
          teal: '#14B8A6',
          emerald: '#10B981',
          rose: '#F43F5E',
          amber: '#F59E0B',
          sky: '#0EA5E9',
        },
        primary: {
          DEFAULT: '#F8F9FA', // Clean white-ish text
          muted: '#8A8F98',   // Muted gray text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
