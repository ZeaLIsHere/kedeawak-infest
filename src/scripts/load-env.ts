import { loadEnvConfig } from "@next/env";

/**
 * Memuat `.env` dan `.env.local` seperti Next.js.
 *
 * Perintah `npm run db:migrate` dan `npm run db:seed` berjalan di luar Next.js,
 * sehingga berkas lingkungan tidak terbaca otomatis. Tanpa pemuatan ini, kedua
 * perintah memakai nilai bawaan, dan penyiapan data demo gagal karena kunci
 * enkripsi pelanggan kosong.
 */
export function loadScriptEnv(): void {
  loadEnvConfig(process.cwd(), true);
}
