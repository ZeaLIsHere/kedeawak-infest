import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Bawaan eslint-config-next
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Perkakas pihak ketiga, hasil bangun, dan media unggahan.
    // Ketiganya bukan karya tim, jadi tidak ikut diperiksa.
    ".claude/**",
    ".opencode/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "uploads/**",
    "public/uploads/**",
  ]),
]);

export default eslintConfig;
