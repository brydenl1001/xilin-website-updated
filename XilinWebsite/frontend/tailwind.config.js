/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#164E63',
          light: '#0E7490',
          soft: '#1e293b',
          muted: '#334155',
        },
        teal: {
          DEFAULT: '#0891B2',
          light: '#22D3EE',
          dark: '#155E75',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        slate: { page: '#F8FAFC' },
      },
      fontFamily: {
        display: ['"EB Garamond"', 'serif'],
        body: ['"Crimson Text"', '"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
