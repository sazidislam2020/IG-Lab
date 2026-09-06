import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

console.log("🚀 Ignite Lab starting...");

// Fix: pressing the browser Back button sometimes restores a stale cached
// page (bfcache) — e.g. an old landing-page template. If the page is being
// restored from the back-forward cache, force a fresh load instead.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);