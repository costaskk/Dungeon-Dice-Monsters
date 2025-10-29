/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './api/**/*.js',
  ],
  theme: {
    extend: {
      // a11y-friendly focus ring color used across components
      colors: {
        ddm: {
          focus: '#fbbf24', // amber-400
        },
      },
    },
  },
  plugins: [],
}
