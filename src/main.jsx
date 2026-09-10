import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { responsiveCSS } from "./lib/responsive";

// Inject responsive base styles
const style = document.createElement("style");
style.textContent = responsiveCSS;
document.head.appendChild(style);

console.log("🚀 Ignite Lab starting...");

// Fix: pressing the browser Back button sometimes restores a stale cached
// page (bfcache) — e.g. an old landing-page template. If the page is being
// restored from the back-forward cache, force a fresh load instead.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

// NOTE: StrictMode is intentionally NOT used here. The 3D simulation page
// (Simulation.jsx) keeps physics singletons at module scope and starts its
// animation loop in a mount effect; StrictMode's dev double-mount would run
// two physics loops against the same world and double-apply impulses.
createRoot(document.getElementById("root")).render(
  <App />
);