/**
 * Responsive breakpoints and helpers
 * Mobile-first approach: base styles = mobile, then add min-width for larger screens
 */

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

// Check if screen is mobile size (for JS conditionals)
export function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoints.tablet;
}

// CSS media query strings for inline styles (used with style tags)
export const media = {
  mobile: `@media (max-width: ${breakpoints.tablet - 1}px)`,
  tablet: `@media (max-width: ${breakpoints.desktop - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
};

// Common responsive CSS to inject once
export const responsiveCSS = `
  /* Global responsive resets */
  * { box-sizing: border-box; }
  
  html { 
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }
  
  body {
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Prevent horizontal scroll on mobile */
  html, body, #root {
    overflow-x: hidden;
    max-width: 100vw;
  }
  
  /* Responsive images */
  img, video {
    max-width: 100%;
    height: auto;
  }
  
  /* Touch-friendly tap targets */
  button, a, input, select, textarea {
    touch-action: manipulation;
  }
  
  /* Remove default styles on mobile inputs */
  input, textarea, select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border-radius: 8px;
  }
  
  /* Mobile-friendly scrollable areas */
  .scroll-x {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .scroll-x::-webkit-scrollbar { display: none; }
  
  /* Responsive utility classes */
  @media (max-width: 767px) {
    .hide-mobile { display: none !important; }
    .show-mobile-only { display: block !important; }
    .full-width-mobile { width: 100% !important; }
    .stack-mobile { 
      flex-direction: column !important;
      flex-wrap: wrap !important;
    }
    .grid-1-mobile {
      grid-template-columns: 1fr !important;
    }
    .p-mobile { padding: 12px !important; }
    .px-mobile { padding-left: 12px !important; padding-right: 12px !important; }
    .gap-mobile { gap: 8px !important; }
    .text-center-mobile { text-align: center !important; }
    .text-sm-mobile { font-size: 12px !important; }
    .w-full-mobile { width: 100% !important; }
    .h-auto-mobile { height: auto !important; }
    .min-h-0-mobile { min-height: 0 !important; }
  }
  
  @media (min-width: 768px) {
    .hide-desktop { display: none !important; }
  }
  
  /* Safe area for iPhone notch */
  @supports (padding: env(safe-area-inset-top)) {
    .safe-top { padding-top: env(safe-area-inset-top); }
    .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  }
`;
