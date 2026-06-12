/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Superficies
        'surface-bg':             'var(--surface-bg)',
        'surface-base':           'var(--surface-base)',
        'surface-raised':         'var(--surface-raised)',
        'surface-sidebar':        'var(--surface-sidebar)',
        'surface-sidebar-hover':  'var(--surface-sidebar-hover)',
        'surface-sidebar-active': 'var(--surface-sidebar-active)',
        // Ink
        'ink-strong': 'var(--ink-strong)',
        'ink-base':   'var(--ink-base)',
        'ink-muted':  'var(--ink-muted)',
        'ink-subtle': 'var(--ink-subtle)',
        // Sidebar ink
        'sidebar-ink-strong': 'var(--sidebar-ink-strong)',
        'sidebar-ink-base':   'var(--sidebar-ink-base)',
        'sidebar-ink-muted':  'var(--sidebar-ink-muted)',
        // Bordes
        'border-subtle':  'var(--border-subtle)',
        'border-base':    'var(--border-base)',
        'border-strong':  'var(--border-strong)',
        'sidebar-border': 'var(--sidebar-border)',
        // Acento
        'accent':            'var(--accent)',
        'accent-glow':       'var(--accent-glow)',
        'accent-hover':      'var(--accent-hover)',
        'accent-active':     'var(--accent-active)',
        'accent-subtle':     'var(--accent-subtle)',
        'accent-foreground': 'var(--accent-foreground)',
        'turbo':        'var(--turbo)',
        'turbo-subtle': 'var(--turbo-subtle)',
        // Estados de cita
        'estado-pendiente':           'var(--estado-pendiente)',
        'estado-pendiente-bg':        'var(--estado-pendiente-bg)',
        'estado-confirmada':          'var(--estado-confirmada)',
        'estado-confirmada-bg':       'var(--estado-confirmada-bg)',
        'estado-en-curso':            'var(--estado-en-curso)',
        'estado-en-curso-bg':         'var(--estado-en-curso-bg)',
        'estado-completada':          'var(--estado-completada)',
        'estado-completada-bg':       'var(--estado-completada-bg)',
        'estado-cancelada':           'var(--estado-cancelada)',
        'estado-cancelada-bg':        'var(--estado-cancelada-bg)',
        'estado-cancelada-tardia':    'var(--estado-cancelada-tardia)',
        'estado-cancelada-tardia-bg': 'var(--estado-cancelada-tardia-bg)',
        'estado-no-show':             'var(--estado-no-show)',
        'estado-no-show-bg':          'var(--estado-no-show-bg)',
        // Semánticos de estado
        'success':       'var(--success)',
        'success-light': 'var(--success-light)',
        'warning':       'var(--warning)',
        'warning-light': 'var(--warning-light)',
        'error':         'var(--error)',
        'error-light':   'var(--error-light)',
        'error-dark':    'var(--error-dark)',
        'info':          'var(--info)',
        'info-light':    'var(--info-light)',
      },
      // ⚠️  fontSize: valor literal — Tailwind no puede resolver var() aquí
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1' }],
      },
      // ⚠️  boxShadow: valores literales — var() no funciona en tiempo de build
      boxShadow: {
        sm:      '0 1px 3px oklch(0.12 0.038 288 / 0.10)',
        DEFAULT: '0 2px 6px oklch(0.12 0.038 288 / 0.12)',
        lg:      '0 4px 16px oklch(0.12 0.038 288 / 0.10)',
        modal:   '0 8px 32px oklch(0.12 0.038 288 / 0.18)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeInRow: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer:       'shimmer 1.4s ease-in-out infinite',
        'fade-in-row': 'fadeInRow 0.3s ease forwards',
        spin:          'spin 1s linear infinite',
      },
      // ⚠️  zIndex: valores numéricos literales — var() no es válido aquí en Tailwind v3
      zIndex: {
        dropdown:         '100',
        sticky:           '200',
        'modal-backdrop': '300',
        modal:            '400',
        toast:            '500',
        tooltip:          '600',
      },
    },
  },
  plugins: [],
}