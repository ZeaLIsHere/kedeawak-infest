import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md di repo ini dikelola manual oleh tim.
  // Penulisan otomatis blok aturan Next.js dimatikan agar tidak menimpa isinya.
  // Panduan Next.js 16 dibaca dari node_modules/next/dist/docs/.
  agentRules: false,
  // Folder terpisah agar verifikasi tidak memakai keluaran server pemilik.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  partialPrefetching: true,
  /*
   * PGlite memuat berkas runtime miliknya sendiri dari cakram. Bila paket ini
   * ikut dibundel, alamat berkasnya berubah menjadi URL dan ditolak oleh
   * `node:fs`, sehingga setiap query gagal. Karena itu paket ini dibiarkan
   * dimuat langsung oleh Node. Driver `pg` sudah masuk daftar bawaan Next.js.
   */
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
