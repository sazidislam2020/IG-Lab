// Ignite Lab — Centralized Theme Tokens
// All pages should import from here instead of hardcoding colors

export const dark = {
  bg: "#09090B",
  surface: "#18181B",
  card: "#1C1C21",
  border: "#27272A",
  borderLight: "#3F3F46",
  txt: "#FAFAFA",
  txtSec: "#A1A1AA",
  txtDim: "#71717A",
  input: "#27272A",
  hover: "#27272A",
};

export const light = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  card: "#F4F4F5",
  border: "#E4E4E7",
  borderLight: "#D4D4D8",
  txt: "#18181B",
  txtSec: "#52525B",
  txtDim: "#A1A1AA",
  input: "#FFFFFF",
  hover: "#E4E4E7",
};

// Shared accent colors (same in both themes)
export const accent = {
  orange: "#FF6B2B",
  orangeDark: "#E85D1A",
  cyan: "#22D3EE",
  green: "#4ADE80",
  gold: "#FACC15",
  red: "#F87171",
  purple: "#A78BFA",
};

// Helper to get theme-aware border color string
export function border(t, opacity = "0.09") {
  return t.bg === "#FAFAFA" ? "#E4E4E7" : `rgba(237,239,243,${opacity})`;
}

// Helper for semi-transparent backgrounds
export function semiBg(t, opacity = 0.6) {
  return t.bg === "#FAFAFA"
    ? `rgba(255,255,255,${opacity})`
    : `rgba(10,14,22,${opacity})`;
}
