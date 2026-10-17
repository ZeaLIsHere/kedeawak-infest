import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Dimatikan terakhir supaya aturan gaya dari ESLint tidak berbenturan
  // dengan pengaturan Prettier. Perapian gaya dikerjakan `npm run format`.
  prettier,
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
