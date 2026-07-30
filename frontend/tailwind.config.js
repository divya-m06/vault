/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ── Color tokens (Vault Precision UI) ─────────────────────────────
      colors: {
        // Surfaces
        surface:                    '#f9f9ff',
        'surface-dim':              '#d6dae7',
        'surface-bright':           '#f9f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f0f3ff',
        'surface-container':        '#eaeefb',
        'surface-container-high':   '#e4e8f5',
        'surface-container-highest':'#dee2ef',
        'surface-variant':          '#dee2ef',
        // Text
        'on-surface':         '#171c25',
        'on-surface-variant': '#3f484b',
        'inverse-surface':    '#2c313a',
        'inverse-on-surface': '#edf0fe',
        // Borders
        outline:          '#6f797c',
        'outline-variant':'#bec8cb',
        // Primary — teal
        primary:                    '#006070',
        'on-primary':               '#ffffff',
        'primary-container':        '#1f7a8c',
        'on-primary-container':     '#e3f8ff',
        'inverse-primary':          '#83d2e6',
        'primary-fixed':            '#a9edff',
        'primary-fixed-dim':        '#83d2e6',
        'on-primary-fixed':         '#001f26',
        'on-primary-fixed-variant': '#004e5b',
        'surface-tint':             '#006879',
        // Secondary
        secondary:                    '#416373',
        'on-secondary':               '#ffffff',
        'secondary-container':        '#c4e8fc',
        'on-secondary-container':     '#47697a',
        'secondary-fixed':            '#c4e8fc',
        'secondary-fixed-dim':        '#a9ccdf',
        'on-secondary-fixed':         '#001f2b',
        'on-secondary-fixed-variant': '#294b5b',
        // Tertiary
        tertiary:                    '#405a72',
        'on-tertiary':               '#ffffff',
        'tertiary-container':        '#58738b',
        'on-tertiary-container':     '#eff6ff',
        'tertiary-fixed':            '#cce5ff',
        'tertiary-fixed-dim':        '#aecae5',
        'on-tertiary-fixed':         '#001d31',
        'on-tertiary-fixed-variant': '#2e4960',
        // Background
        background:     '#f9f9ff',
        'on-background':'#171c25',
        // Error
        error:               '#ba1a1a',
        'on-error':          '#ffffff',
        'error-container':   '#ffdad6',
        'on-error-container':'#93000a',
      },

      // ── Typography ────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.02em' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg':     ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md':     ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm':     ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-bold':  ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.02em' }],
        'label-md':    ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'mono-label':  ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },

      // ── Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        sm:      '2px',
        DEFAULT: '4px',
        md:      '6px',
        lg:      '8px',
        xl:      '12px',
        full:    '9999px',
      },

      // ── Spacing tokens ────────────────────────────────────────────────
      spacing: {
        'sidebar-width':      '240px',
        'container-padding':  '24px',
        'gutter':             '16px',
        'component-gap-sm':   '8px',
        'component-gap-md':   '12px',
      },
    },
  },
  plugins: [],
}
