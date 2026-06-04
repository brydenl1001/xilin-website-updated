/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E3A8A',
          soft: '#1e293b',
          muted: '#334155',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E2B53E',
          muted: '#f5e49c',
          dark: '#92740b',
        },
        slate: { page: '#F8FAFC' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
