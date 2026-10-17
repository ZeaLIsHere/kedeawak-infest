import { getDatabase, type Database } from "../db/client";
import { getCurrentBusiness } from "./business";

/*
 * Jembatan antara pegangan basis data proses ini dan fungsi fungsi di
 * `src/lib/data/`.
 *
 * Dua aturan repo bertemu di sini. Pertama, komponen di `src/components/`
 * dilarang menyentuh `src/lib/db/`, sehingga komponen tidak dapat mengambil
 * pegangan sendiri. Kedua, seluruh fungsi lapisan data menerima pegangan secara
 * eksplisit supaya pengujian terpisah dan tidak bergantung pada keadaan global.
 *
 * Jembatan inilah yang menyediakan pegangan itu untuk halaman, dan sekaligus
 * menjawab pertanyaan "warung yang mana" pada aplikasi demo yang hanya memuat
 * satu warung.
 */

/** Pembacaan yang membutuhkan pegangan dan id warung berjalan. */
export type BusinessReader<T> = (db: Database, businessId: string) => Promise<T>;

/**
 * Menjalankan pembacaan untuk warung yang sedang berjalan.
 *
 * Menjawab `undefined` bila belum ada baris warung, misalnya pada basis data
 * yang baru dimigrasi, supaya halaman dapat menampilkan keadaan kosong alih
 * alih galat.
 *
 * Parameter `db` hanya dipakai pengujian. Halaman tidak pernah mengisinya.
 */
export async function withCurrentBusiness<T>(
  read: BusinessReader<T>,
  db: Database = getDatabase(),
): Promise<T | undefined> {
  const business = await getCurrentBusiness(db);

  if (business === undefined) {
    return undefined;
  }

  return read(db, business.id);
}
