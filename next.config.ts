import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md di repo ini dikelola manual oleh tim.
  // Penulisan otomatis blok aturan Next.js dimatikan agar tidak menimpa isinya.
  // Panduan Next.js 16 dibaca dari node_modules/next/dist/docs/.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
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
