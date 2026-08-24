/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // One accent, used only for actions and the active state.
        accent: {
          DEFAULT: '#4F46E5',
          soft: '#EEF0FE',
          rule: '#C7C9F7',
          deep: '#3730A3',
        },
        ink: {
          DEFAULT: '#0F1117',
          muted: '#5A6172',
          faint: '#8A90A0',
        },
        canvas: '#F7F8FA',
        hairline: '#E6E8EC',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        bar: '0 -1px 0 0 #E6E8EC, 0 -8px 24px -12px rgba(15, 17, 23, 0.12)',
        pop: '0 12px 32px -12px rgba(15, 17, 23, 0.24)',
      },
      maxWidth: {
        app: '56rem',
      },
    },
  },
  plugins: [],
};
