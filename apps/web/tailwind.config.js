/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pine: { 50: '#edf6f2', 100: '#d7ebe2', 500: '#2e7864', 600: '#235f50', 700: '#1b4c40', 800: '#173f35', 900: '#12312a' },
        sand: { 50: '#fbfaf6', 100: '#f5f1e7', 200: '#e9dfca' },
        coral: { 100: '#ffe3d8', 500: '#df7251', 600: '#c75b3b' },
      },
      boxShadow: {
        soft: '0 18px 45px -24px rgba(21, 58, 49, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

