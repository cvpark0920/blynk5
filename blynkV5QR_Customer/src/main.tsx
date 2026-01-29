import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { LanguageProvider } from "./app/i18n/LanguageContext";
import { Toaster } from "./app/components/ui/sonner";

if (typeof document !== "undefined") {
  const preventGesture = (event: Event) => event.preventDefault();
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
    <Toaster position="top-center" />
  </LanguageProvider>
);
  