export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#6366f1',
          600: '#4f46e5',
        },
        success: {
          500: '#10b981',
        },
        danger: {
          500: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
