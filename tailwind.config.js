/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sga: {
          primary: '#1e40af', // blue-800
          secondary: '#3b82f6', // blue-500
          success: '#16a34a', // green-600
          danger: '#dc2626', // red-600
          warning: '#ea580c', // orange-600
          dark: '#1f2937', // gray-800
          light: '#f3f4f6', // gray-100
        },
        brand: {
          olive: '#6b7012',
          red: '#b90014',
          light: '#f4f5f9',
        }
      }
    },
  },
  plugins: [],
}
