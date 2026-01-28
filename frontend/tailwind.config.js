/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This tells Tailwind to look at all your React files
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'jukebox-gold': '#D4AF37',
      }
    },
  },
  plugins: [],
}