import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@meta-sql/ui/styles/globals.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
