/** Bentuk kunci baris yang dipakai seluruh tabel. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Memeriksa bentuk kunci baris.
 *
 * Kunci yang bukan uuid tidak akan pernah cocok dengan baris mana pun, dan bila
 * dikirim ke basis data akan menjadi galat query. Karena itu pencarian
 * memeriksanya lebih dulu dan menjawab kosong, supaya alamat halaman yang salah
 * menghasilkan jawaban kosong, bukan galat server.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
