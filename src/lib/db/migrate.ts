import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { resolve } from "node:path";

import type { DatabaseHandle } from "./client";

/** Folder berkas migrasi hasil `npm run db:generate`. */
export const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

/*
 * Penerapan migrasi tidak memakai perintah milik drizzle-kit, sebab perintah
 * itu hanya dapat menyambung ke Postgres lewat jaringan. Fungsi di bawah ini
 * memakai penerap milik Drizzle ORM, sehingga driver PGlite dan driver
 * Postgres sama sama dapat menerapkan migrasi yang sama.
 */

/** Menerapkan seluruh migrasi yang belum dijalankan pada pegangan ini. */
export async function runMigrations(
  handle: DatabaseHandle,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<void> {
  if (handle.driver === "postgres") {
    await migratePostgres(handle.db, { migrationsFolder });

    return;
  }

  await migratePglite(handle.db, { migrationsFolder });
}
