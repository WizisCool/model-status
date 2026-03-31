/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        surfaceHover: 'var(--surfaceHover)',
        border: 'var(--border)',
        textPrimary: 'var(--textPrimary)',
        textSecondary: 'var(--textSecondary)',
        textMuted: 'var(--textMuted)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', '"Fira Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', '"Newsreader"', 'ui-serif', 'Georgia', 'serif'],
        display: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', '"Newsreader"', 'ui-serif', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
