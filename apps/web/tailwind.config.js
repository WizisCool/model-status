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
        mono: ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', '"Source Han Serif SC"', 'ui-serif', 'Georgia', 'serif'],
        display: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', '"Source Han Serif SC"', 'ui-serif', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
