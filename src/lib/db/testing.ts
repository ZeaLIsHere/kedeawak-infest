import { createDatabase, type Database, type DatabaseHandle } from "./client";
import { runMigrations } from "./migrate";
import { businesses, type Business } from "./schema";

/*
 * Alat bantu pengujian lapisan data.
 *
 * Letaknya di `src/lib/db/` supaya pengujian lapisan data tidak berulang kali
 * menulis penyiapan yang sama: basis data di memori, seluruh migrasi
 * diterapkan, lalu satu warung dibuat sebagai induk seluruh baris uji.
 */

/** Basis data uji beserta warung induknya. */
export type TestDatabase = {
  readonly handle: DatabaseHandle;
  readonly db: Database;
  readonly business: Business;
  readonly close: () => Promise<void>;
};

/** Membuka basis data uji di memori, sudah dimigrasi dan berisi satu warung. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const handle = createDatabase({ PGLITE_DATA_DIR: "memory://" });

  await runMigrations(handle);

  const [business] = await handle.db
    .insert(businesses)
    .values({ name: "Warung Uji", opensAt: "06:00:00", closesAt: "21:00:00" })
    .returning();

  if (business === undefined) {
    await handle.close();
    throw new Error("Warung uji gagal dibuat");
  }

  return { handle, db: handle.db, business, close: () => handle.close() };
}

/** Warung kedua, dipakai untuk menguji pemisahan data antar warung. */
export async function createSecondBusiness(
  db: Database,
  name = "Warung Tetangga",
): Promise<Business> {
  const [business] = await db.insert(businesses).values({ name }).returning();

  if (business === undefined) {
    throw new Error("Warung kedua gagal dibuat");
  }

  return business;
}
