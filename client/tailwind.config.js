/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      container: {
        // You can add breakpoints here to make the container wider at certain screen sizes
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
          // Or add a custom breakpoint to make it even wider
          '3xl': '1920px', 
        },
        // You can also add horizontal padding
        padding: '2rem',
        // And center it by default
        center: true,
      },
    },
  },
  plugins: [],
}