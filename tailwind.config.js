/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e91e63',
        'primary-light': '#f48fb1',
        'dark-bg': '#1a1a1a',
        'dark-surface': '#2a2a2a',
        'dark-surface-light': '#3a3a3a',
        'dark-text': '#ffffff',
        'dark-text-secondary': '#b0b0b0',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}