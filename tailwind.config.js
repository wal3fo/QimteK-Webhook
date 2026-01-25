/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ["class", '[data-bs-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // QimteK Dark Theme Colors
        'qimtek': {
          'bg': 'var(--QimteK-body-bg, #1a1a1a)',
          'bg-surface': 'var(--QimteK-bg-surface, #242424)',
          'bg-secondary': 'var(--QimteK-bg-surface-secondary, #2b2b2b)',
          'text': 'var(--QimteK-body-color, #e8e8e8)',
          'text-secondary': 'var(--QimteK-secondary-color, rgba(232, 232, 232, 0.75))',
          'text-tertiary': 'var(--QimteK-tertiary-color, rgba(232, 232, 232, 0.5))',
          'border': 'var(--QimteK-border-color, #3d3d3d)',
          'border-active': 'var(--QimteK-dark-mode-border-color-active, #2c415d)',
          'primary': 'var(--QimteK-primary, #82c91e)',
          'lime': 'var(--QimteK-lime, #82c91e)',
        },
      },
      backgroundColor: {
        'dark': 'var(--QimteK-body-bg, #1a1a1a)',
        'dark-surface': 'var(--QimteK-bg-surface, #242424)',
        'dark-secondary': 'var(--QimteK-bg-surface-secondary, #2b2b2b)',
      },
      textColor: {
        'dark': 'var(--QimteK-body-color, #e8e8e8)',
        'dark-secondary': 'var(--QimteK-secondary-color, rgba(232, 232, 232, 0.75))',
      },
      borderColor: {
        'dark': 'var(--QimteK-border-color, #303030)',
        'dark-active': 'var(--QimteK-dark-mode-border-color-active, #2c415d)',
      },
    },
  },
  plugins: [],
};
