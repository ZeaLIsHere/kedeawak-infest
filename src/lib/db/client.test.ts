import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabase, resolveDriver, type DatabaseHandle } from "./client";
import { products } from "./schema";

/** Lingkungan untuk pengujian: PGlite di memori, tanpa menyentuh berkas disk. */
const MEMORY_ENV = { PGLITE_DATA_DIR: "memory://" } satisfies Record<string, string>;

let memory: DatabaseHandle | undefined;

/*
 * PGlite menyiapkan PostgreSQL di dalam proses, dan penyiapan itu memakan
 * waktu. Karena itu satu pegangan dipakai bersama seluruh uji di berkas ini.
 */
async function memoryDatabase(): Promise<DatabaseHandle> {
  if (memory === undefined) {
    const handle = createDatabase(MEMORY_ENV);

    await handle.db.execute(sql`select 1`);
    memory = handle;
  }

  return memory;
}

/** Mengambil klien PGlite dari pegangan, dengan pemeriksaan driver. */
async function memoryClient(): Promise<PGlite> {
  const handle = await memoryDatabase();

  if (!(handle.client instanceof PGlite)) {
    throw new Error("Driver yang terbuka bukan PGlite");
  }

  return handle.client;
}

afterAll(async () => {
  await memory?.close();
  memory = undefined;
});

describe("pemilih driver basis data", () => {
  it("memakai PGlite bila alamat basis data tidak diatur", () => {
    expect(resolveDriver({})).toBe("pglite");
  });

  it("mengabaikan alamat basis data yang hanya berisi spasi", () => {
    expect(resolveDriver({ DATABASE_URL: "   " })).toBe("pglite");
  });

  it("memakai Postgres bila alamat basis data diatur", () => {
    expect(
      resolveDriver({ DATABASE_URL: "postgres://warung@localhost:5432/kedewak" }),
    ).toBe("postgres");
  });

  it("mengenali driver yang sedang dipakai", async () => {
    expect((await memoryDatabase()).driver).toBe("pglite");
  });

  it("menjalankan PostgreSQL asli di dalam proses", async () => {
    const client = await memoryClient();
    const result = await client.query<{ value: number }>("select 1 as value");

    expect(result.rows).toEqual([{ value: 1 }]);
  });

  it("menyusun query lewat tipe basis data yang sama untuk kedua driver", async () => {
    const handle = await memoryDatabase();
    const businessId = "00000000-0000-0000-0000-000000000000";
    const query = handle.db
      .select()
      .from(products)
      .where(eq(products.businessId, businessId));

    expect(query.toSQL().sql).toContain("select");
    expect(query.toSQL().params).toEqual([businessId]);
  });

  /*
   * Penyimpanan di disk menyiapkan seluruh berkas basis data lebih dulu,
   * sehingga jauh lebih lambat daripada penyimpanan di memori.
   */
  it("membuat folder bertingkat sebelum membuka penyimpanan", async () => {
    const root = join(tmpdir(), `kedeawak-uji-${randomUUID()}`);
    const dataDir = join(root, "satu", "dua");
    const handle = createDatabase({ PGLITE_DATA_DIR: dataDir });

    try {
      await handle.db.execute(sql`select 1`);

      expect(existsSync(dataDir)).toBe(true);
    } finally {
      await handle.close();
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
