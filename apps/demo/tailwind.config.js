import uiConfig from "@meta-sql/ui/tailwind.config";

/** @type {import('tailwindcss').Config} */
export default {
  ...uiConfig,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include UI library components
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};
