/** @type {import('tailwindcss').Config} */
import animate from 'tw-animate-css'

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: [
    animate
  ]
}
