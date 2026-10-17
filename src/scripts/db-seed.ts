import { sql } from "drizzle-orm";

import { createDatabase, type DatabaseHandle } from "../lib/db/client";
import { DEMO_BUSINESS_NAME, seedDemoData } from "../lib/db/seed";
import { loadScriptEnv } from "./load-env";

const COUNT_TABLES = sql`select count(*)::int as total
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'`;

/** Memastikan tabel sudah ada, supaya pesan gagalnya jelas. */
async function assertTablesReady(handle: DatabaseHandle): Promise<void> {
  const result = await handle.db.execute<{ total: number }>(COUNT_TABLES);

  if ((result.rows[0]?.total ?? 0) === 0) {
    throw new Error("Tabel belum ada. Jalankan npm run db:migrate lebih dulu.");
  }
}

/** Titik masuk `npm run db:seed`. */
async function main(): Promise<void> {
  loadScriptEnv();

  const handle = createDatabase();

  try {
    await assertTablesReady(handle);

    const result = await seedDemoData(handle.db);

    console.log(`Data demo disiapkan pada driver ${handle.driver}.`);
    console.log(`Warung: ${DEMO_BUSINESS_NAME}.`);
    console.log(
      `Produk: ${result.products}, pelanggan: ${result.customers}, percakapan: ${result.conversations}.`,
    );
    console.log(
      `Orderan: ${result.orders}, transaksi: ${result.transactions}, pergerakan stok: ${result.stockMovements}.`,
    );
    console.log(
      `Alert aktif: ${result.activeAlerts}, aksi menunggu: ${result.pendingApprovals}, konteks bisnis: ${result.knowledgeChunks}.`,
    );
  } finally {
    await handle.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Penyiapan data demo gagal.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
