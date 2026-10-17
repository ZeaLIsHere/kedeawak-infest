import { PGlite } from "@electric-sql/pglite";
import {
  drizzle as drizzlePostgres,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { Pool } from "pg";

import * as schema from "./schema";

/*
 * Pemilih driver basis data.
 *
 * Satu kode melayani dua driver, sesuai `docs/ARCHITECTURE.md` bagian 2:
 *
 * 1. `DATABASE_URL` terisi: driver `pg` ke PostgreSQL biasa, dipakai saat
 *    produksi di Supabase atau Neon.
 * 2. `DATABASE_URL` kosong: PGlite, PostgreSQL asli yang berjalan di dalam
 *    proses Node, dipakai untuk demo tanpa pemasangan server.
 *
 * Berkas ini satu satunya tempat yang mengetahui perbedaan kedua driver.
 * Lapisan `src/lib/data/` hanya menerima `Database`, tanpa peduli driver mana
 * yang sedang dipakai.
 */

/** Nama driver yang sedang aktif. */
export type DriverName = "pglite" | "postgres";

/** Tipe basis data yang diterima lapisan akses data. */
export type Database = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

/** Satu pegangan basis data beserta cara menutupnya. */
export type DatabaseHandle = {
  driver: DriverName;
  db: Database;
  client: PGlite | Pool;
  close: () => Promise<void>;
};

/** Direktori bawaan penyimpanan PGlite. Direktori ini masuk `.gitignore`. */
export const DEFAULT_PGLITE_DATA_DIR = ".pglite/kedeawak";

/** Lingkungan yang dibaca pemilih driver. Bentuknya sengaja lebih longgar dari `process.env` supaya dapat diuji. */
export type Environment = Readonly<Record<string, string | undefined>>;

function readEnv(env: Environment, key: string): string | undefined {
  const value = env[key]?.trim();

  return value === undefined || value === "" ? undefined : value;
}

/** Menentukan driver dari lingkungan, tanpa memanggil basis datanya. */
export function resolveDriver(env: Environment = process.env): DriverName {
  return readEnv(env, "DATABASE_URL") === undefined ? "pglite" : "postgres";
}

/*
 * PGlite hanya membuat direktori terakhir, bukan direktori bertingkat, sehingga
 * folder induk seperti `.pglite` harus dibuat lebih dulu. Nilai berupa alamat
 * seperti `memory://` dilewati.
 */
function ensureDataDir(dataDir: string): void {
  if (dataDir.includes("://")) {
    return;
  }

  mkdirSync(isAbsolute(dataDir) ? dataDir : resolve(process.cwd(), dataDir), {
    recursive: true,
  });
}

/** Membuka pegangan basis data baru. Pemanggil bertanggung jawab menutupnya. */
export function createDatabase(env: Environment = process.env): DatabaseHandle {
  if (resolveDriver(env) === "postgres") {
    const client = new Pool({ connectionString: readEnv(env, "DATABASE_URL") });

    return {
      driver: "postgres",
      client,
      db: drizzlePostgres(client, { schema }),
      close: () => client.end(),
    };
  }

  const dataDir = readEnv(env, "PGLITE_DATA_DIR") ?? DEFAULT_PGLITE_DATA_DIR;

  ensureDataDir(dataDir);

  const client = new PGlite(dataDir);

  return {
    driver: "pglite",
    client,
    db: drizzlePglite(client, { schema }),
    close: () => client.close(),
  };
}

/*
 * Pegangan dipasang di `globalThis` supaya pemuatan ulang modul saat
 * pengembangan tidak membuka koneksi PGlite kedua ke direktori yang sama.
 * PGlite hanya mengizinkan satu penulis per direktori.
 */
const state = globalThis as typeof globalThis & { __kedeawakDatabase?: DatabaseHandle };

/** Pegangan basis data proses ini, dibuka saat pertama kali diminta. */
export function getDatabaseHandle(): DatabaseHandle {
  state.__kedeawakDatabase ??= createDatabase();

  return state.__kedeawakDatabase;
}

/** Basis data untuk lapisan akses data. */
export function getDatabase(): Database {
  return getDatabaseHandle().db;
}

/** Menutup pegangan basis data proses ini. Dipakai oleh skrip dan pengujian. */
export async function closeDatabase(): Promise<void> {
  const current = state.__kedeawakDatabase;

  if (current === undefined) {
    return;
  }

  state.__kedeawakDatabase = undefined;
  await current.close();
}
