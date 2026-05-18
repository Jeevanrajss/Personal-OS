/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#F4F1FF',
          100: '#E9ECF5',
          200: '#C9D0E0',   // fg-2  secondary text
          300: '#A0A9BC',   // fg-3  tertiary / placeholder
          400: '#7B8498',   // fg-4  muted / caption
          500: '#5A6275',   // fg-disabled
          600: '#3A4050',   // neutral-600
          700: '#232734',   // surface-hover
          800: '#1C2030',   // surface-elevated
          900: '#151827',   // surface (cards)
          950: '#0E1018',   // bg-app
        },
        accent: {
          DEFAULT: '#8B7CFF',              // primary-500
          hover:   '#9D8DFF',              // primary-400
          muted:   '#4E3FB8',              // primary-800
          glow:    'rgba(139,124,255,0.15)',
        },
      },
      fontFamily: {
        sans:    ['Inter var', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Clash Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card:    '16px',
        'card-xl': '20px',
      },
      backgroundImage: {
        'gradient-primary':      'linear-gradient(135deg, #8B7CFF 0%, #6352DB 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, rgba(139,124,255,0.16), rgba(99,82,219,0.08))',
        'gradient-aurora':       'linear-gradient(135deg, #8B7CFF 0%, #3EBEFF 50%, #FF7AD9 100%)',
      },
    },
  },
  plugins: [],
};
