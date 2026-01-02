/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#10b981', // Emerald - easier on eyes
        'neon-red': '#ef4444',
        'neon-cyan': '#06b6d4',
        'neon-purple': '#a855f7',
        'neon-amber': '#f59e0b',
        'dark-bg': '#0f172a', // Slate 900
        'panel-bg': '#1e293b', // Slate 800
        'card-bg': '#0f172a',
        'border-color': '#334155', // Slate 700
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
}
