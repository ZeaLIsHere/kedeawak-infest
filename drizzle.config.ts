import { defineConfig } from "drizzle-kit";

/*
 * Konfigurasi pembuat migrasi.
 *
 * Perintah `npm run db:generate` membaca skema di `src/lib/db/schema.ts` dan
 * menulis berkas SQL ke folder `drizzle/`. Penerapan migrasi tidak memakai
 * drizzle-kit, melainkan `npm run db:migrate`, karena penerapan harus jalan di
 * kedua driver termasuk PGlite yang tidak punya alamat jaringan.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
