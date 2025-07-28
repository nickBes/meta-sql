import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_URL || "/",
  resolve: {
    alias: {
      "@meta-sql/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});
