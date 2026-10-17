import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/*
 * Berkas ini memakai akhiran `.mts` supaya jelas berformat modul, karena
 * `package.json` proyek tidak menetapkan `type`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    /*
     * Hanya pengujian unit dan integrasi di dalam `src/`. Alur peramban diuji
     * Playwright lewat `npm run test:e2e`, bukan Vitest. Lihat
     * `docs/ARCHITECTURE.md` bagian 9.
     */
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["vitest.setup.ts"],
    /*
     * PGlite adalah PostgreSQL di dalam proses, dan penyiapannya memakan waktu
     * yang berbeda beda. Batas bawaan lima detik terbukti terlampaui saat
     * beberapa berkas uji berjalan bersamaan, sehingga batasnya dinaikkan.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
