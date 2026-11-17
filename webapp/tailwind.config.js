/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Thème noir & doré — mappé depuis frontend/src/utils/colors.js
        gold: {
          50: '#FDF8E7',
          100: '#FAF0C8',
          200: '#F5E28F',
          300: '#FFE066',   // accentLight
          400: '#FFD700',   // primaryLight
          500: '#D4AF37',   // primary
          600: '#DAA520',   // accent
          700: '#B8941E',   // primaryDark
          800: '#C5910A',   // accentDark
          900: '#8A6D14',
        },
        night: {
          500: '#4D4D4D',   // borderLight
          600: '#3D3D3D',   // border
          700: '#2D2D2D',   // surfaceLight
          800: '#1A1A1A',   // surface
          900: '#0D0D0D',   // background
          950: '#0A0A0A',   // secondaryDark
        },
        premium: {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          light: '#A78BFA',
        },
        danger: '#DC3545',
        cream: '#F5F5F5',   // text
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 4px 20px -4px rgba(212, 175, 55, 0.35)',
        'gold-sm': '0 2px 8px -2px rgba(212, 175, 55, 0.25)',
        premium: '0 4px 20px -4px rgba(139, 92, 246, 0.35)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #D4AF37, #FFD700)',
        'gradient-gold-deep': 'linear-gradient(135deg, #B8941E, #FFD700)',
        'gradient-night': 'linear-gradient(135deg, #1A1A1A, #0A0A0A)',
        'gradient-premium': 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      },
    },
  },
  plugins: [],
}
