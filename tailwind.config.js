/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/pages/**/*.html',
    './app/components/**/*.html',
    './app/css/**/*.css',
    './app/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        arial: ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};