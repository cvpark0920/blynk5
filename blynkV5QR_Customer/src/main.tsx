import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { LanguageProvider } from "./app/i18n/LanguageContext";
import { Toaster } from "./app/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
    <Toaster position="top-center" />
  </LanguageProvider>
);
  