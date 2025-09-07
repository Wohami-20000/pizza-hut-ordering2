/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#D71921',
        'brand-yellow': '#FFC72C',
        'brand-dark': '#231F20',
      }
    },
  },
  plugins: [],
}