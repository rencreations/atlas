import type { Config } from 'tailwindcss';

const config: Config = {
  // Class-based dark mode: ThemeProvider toggles `.dark` on <html>.
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Tokens reference CSS variables so the `.dark` class (see
        // globals.css) can re-theme the whole app without touching
        // component code.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        'surface-inverse': 'rgb(var(--surface-inverse) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
          3: 'rgb(var(--ink-3) / <alpha-value>)',
          4: 'rgb(var(--ink-4) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        brand: {
          blue: 'rgb(var(--brand-blue) / <alpha-value>)',
          yellow: 'rgb(var(--brand-yellow) / <alpha-value>)',
          red: 'rgb(var(--brand-red) / <alpha-value>)',
          green: 'rgb(var(--brand-green) / <alpha-value>)',
          'blue-50': 'rgb(var(--brand-blue-50) / <alpha-value>)',
          'yellow-50': 'rgb(var(--brand-yellow-50) / <alpha-value>)',
          'red-50': 'rgb(var(--brand-red-50) / <alpha-value>)',
          'green-50': 'rgb(var(--brand-green-50) / <alpha-value>)',
          'yellow-ink': 'rgb(var(--brand-yellow-ink) / <alpha-value>)',
          'yellow-fg': 'rgb(var(--brand-yellow-fg) / <alpha-value>)',
          'blue-strong': 'rgb(var(--brand-blue-strong) / <alpha-value>)',
          'red-strong': 'rgb(var(--brand-red-strong) / <alpha-value>)',
          'green-strong': 'rgb(var(--brand-green-strong) / <alpha-value>)',
        },
        focus: 'rgb(var(--focus) / <alpha-value>)',
      },
      fontFamily: {
        display: [
          '"Bricolage Grotesque"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        sans: ['"Geist"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-2xl': [
          'clamp(2.5rem, 6vw + 1rem, 4.5rem)',
          { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '600' },
        ],
        'display-xl': [
          'clamp(2rem, 4.5vw + 1rem, 3.5rem)',
          { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' },
        ],
        'display-lg': [
          'clamp(1.75rem, 3vw + 1rem, 2.5rem)',
          { lineHeight: '1.10', letterSpacing: '-0.02em', fontWeight: '600' },
        ],
        h1: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.30', letterSpacing: '-0.005em', fontWeight: '600' }],
        h4: ['1.0625rem', { lineHeight: '1.40', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.60' }],
        body: ['1rem', { lineHeight: '1.60' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.55' }],
        caption: [
          '0.8125rem',
          { lineHeight: '1.50', letterSpacing: '0.005em', fontWeight: '500' },
        ],
        eyebrow: [
          '0.75rem',
          { lineHeight: '1.40', letterSpacing: '0.12em', fontWeight: '600' },
        ],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '20px',
        xl: '28px',
      },
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '120': '120ms',
        '200': '200ms',
        '320': '320ms',
        '520': '520ms',
        '800': '800ms',
      },
      maxWidth: {
        prose: '640px',
        container: '1200px',
        'container-wide': '1360px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateX(16px) scale(0.98)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-out': 'fade-out 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-out': 'toast-out 200ms cubic-bezier(0.4, 0, 1, 1) both',
        'modal-in': 'modal-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        spin: 'spin-slow 0.8s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')({ strategy: 'class' }), require('tailwindcss-animate')],
};

export default config;
