/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Oil-dark theme
        oil: {
          950: '#0a0a14',
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#1f3050',
          500: '#2a4066',
          400: '#3d5a80',
          300: '#5a7faa',
        },
        crude: {
          DEFAULT: '#d4a017',
          light: '#f0c040',
          dark: '#9a7412',
          50: '#fef9e7',
          100: '#fcefc4',
          200: '#f9df89',
          300: '#f5c842',
          400: '#f0c040',
          500: '#d4a017',
          600: '#9a7412',
          700: '#6d520e',
          800: '#4a380a',
          900: '#2d2206',
        },
        flame: {
          DEFAULT: '#e94560',
          light: '#ff6b81',
          dark: '#c0392b',
        },
        petro: {
          green: '#2ecc71',
          blue: '#3498db',
        },
        // shadcn-compatible CSS var colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'pump': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-15deg)' },
        },
        'bubble-up': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-60px) scale(0.8)' },
        },
        'oil-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 0%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 160, 23, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 160, 23, 0.6)' },
        },
        'smoke': {
          '0%': { opacity: '0.6', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(1.5)' },
        },
      },
      animation: {
        'pump': 'pump 2s ease-in-out infinite',
        'bubble-up': 'bubble-up 1.5s ease-out forwards',
        'oil-flow': 'oil-flow 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'smoke': 'smoke 2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
