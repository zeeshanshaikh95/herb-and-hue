/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#073B24',
          dark: '#052D1B',
          deep: '#032215',
          light: '#0B4A2E',
          soft: '#14553A',
        },
        gold: {
          DEFAULT: '#D9B66F',
          light: '#E8D3A5',
          pale: '#F2E6CB',
          dark: '#B08D48',
        },
        ivory: {
          DEFAULT: '#F8F4E9',
          dark: '#F1EADA',
          deep: '#E6DCC6',
        },
        sage: {
          DEFAULT: '#DCE5D8',
          dark: '#C7D5C3',
          light: '#EDF2EA',
        },
        charcoal: '#222821',
        muted: '#5C6357',
        clay: '#B4856A',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        eyebrow: '0.28em',
        button: '0.18em',
      },
      maxWidth: {
        editorial: '1360px',
      },
      boxShadow: {
        soft: '0 18px 60px -32px rgba(5, 45, 27, 0.35)',
        lift: '0 26px 70px -34px rgba(5, 45, 27, 0.45)',
        inset: 'inset 0 0 0 1px rgba(217, 182, 111, 0.35)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.6s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
