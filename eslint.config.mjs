// eslint.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, globalIgnores } from "eslint/config";

// Preset ufficiali Next (flat)
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Type-aware solo dove serve
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  // Base Next.js (risolve JSX/React scope ecc.)
  ...nextVitals,
  ...nextTs,

  // Ignora build artifacts + config
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    "eslint.config.mjs",
  ]),

  // OVERRIDE "INCREMENTALE":
  // 1) Spegniamo regole che oggi generano valanghe e bloccano l'adozione
  {
    rules: {
      // React/Next "rumorose" (oggi non le vogliamo bloccare)
      "react/no-unescaped-entities": "off",
      "react/jsx-no-undef": "off",

      "@next/next/no-img-element": "off",
      "@next/next/no-assign-module-variable": "off",

      // Hook rules "nuove/verbose" che stanno esplodendo nel repo
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",

      // TS "rumorose" (non vogliamo bloccare ora)
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Importante: no-floating-promises lo attiviamo SOLO sotto, server-side
      "@typescript-eslint/no-floating-promises": "off",
    },
  },

  // 2) HARD RULE (SOLO SERVER-SIDE): no-floating-promises type-aware
  {
    files: [
      "app/api/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
    },
  },

  // 3) REACT-HOOKS/EXHAUSTIVE-DEPS (SOLO AREA-RISERVATA)
  {
    files: ["app/area-riservata/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // 4) REACT-HOOKS/EXHAUSTIVE-DEPS (SOLO LIVE PUBBLICA)
  {
    files: ["app/live/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // 5) NO-FLOATING-PROMISES (SOLO COMPONENTS/LIVE)
  {
    files: ["components/live/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
    },
  },
]);
