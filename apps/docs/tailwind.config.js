/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include UI library components
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};
