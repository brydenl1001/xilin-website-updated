/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy for dark surfaces (hero, sidebar, panels)
        navy: {
          DEFAULT: '#0F2350',
          light: '#1B3A73',
          dark: '#0A1838',
        },
        slate: { page: '#F8FAFC' },
      },
      fontFamily: {
        display: ['"EB Garamond"', '"Noto Serif SC"', 'serif'],
        body: ['"Crimson Text"', '"Noto Sans SC"', '"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
