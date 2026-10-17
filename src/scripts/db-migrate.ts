import { sql } from "drizzle-orm";

import { createDatabase, type DatabaseHandle } from "../lib/db/client";
import { runMigrations } from "../lib/db/migrate";

const COUNT_TABLES = sql`select count(*)::int as total
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'`;

/** Menghitung tabel yang sudah ada, sebagai bukti migrasi benar benar jalan. */
async function countPublicTables(handle: DatabaseHandle): Promise<number> {
  const result = await handle.db.execute<{ total: number }>(COUNT_TABLES);

  return result.rows[0]?.total ?? 0;
}

/** Titik masuk `npm run db:migrate`. */
async function main(): Promise<void> {
  const handle = createDatabase();

  try {
    await runMigrations(handle);

    const total = await countPublicTables(handle);

    console.log(`Migrasi diterapkan pada driver ${handle.driver}.`);
    console.log(`Tabel pada skema public: ${total}.`);
  } finally {
    await handle.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Migrasi gagal.");
  console.error(error);
  process.exitCode = 1;
});
