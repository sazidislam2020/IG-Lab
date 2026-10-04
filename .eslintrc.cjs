// ESLint config for Ignite Lab (React + Vite)
// Uses the plugins already present in package.json.
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  ignorePatterns: ["dist", "node_modules", "*.cjs"],
  rules: {
    // Vite uses the automatic JSX runtime — no React import needed
    "react/react-in-jsx-scope": "off",
    // The project does not use PropTypes (roles/types come from Supabase)
    "react/prop-types": "off",
    // Unused vars are flagged but don't fail the build; hard errors do.
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};
