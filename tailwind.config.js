/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind where to look for class names. Our project lives under
  // the `app` directory instead of `src`, so watch all files there. We also
  // include `lib` in case we add components or hooks with Tailwind classes.
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./lib/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006FCB',
          dark: '#005ca2',
        },
        secondary: {
          DEFAULT: '#570A57',
          dark: '#430843',
        },
        card: '#0E1E42',
        surface: '#1B2D59',
        text: {
          DEFAULT: '#F2F2F2',
          muted: '#A3A3A3',
        },
      },
    },
  },
  plugins: [],
};
