/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff', 100: '#e0e0ff', 200: '#c7c4ff', 300: '#a5a0ff',
          400: '#8b83ff', 500: '#6C63FF', 600: '#5a50e6', 700: '#4a40bf',
          800: '#3d3599', 900: '#332d7a'
        },
        dark: {
          800: '#1e1e36', 900: '#16162b', 950: '#0f0f20'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    }
  },
  plugins: []
}
