/*
 * Batas hari dan minggu untuk laporan dan pembatas harian.
 *
 * Seluruh warung berada di Indonesia, sehingga batas hari mengikuti Waktu
 * Indonesia Barat, yaitu UTC+7. Indonesia tidak memakai waktu musim panas, jadi
 * pergeseran tetap ini cukup. Bila kelak ada warung di zona waktu lain, kolom
 * zona waktu pada tabel warung perlu ditambahkan lebih dulu.
 */

/** Pergeseran Waktu Indonesia Barat terhadap UTC. */
export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Awal hari yang memuat waktu tersebut. */
export function startOfDay(at: Date): Date {
  const shifted = at.getTime() + JAKARTA_OFFSET_MS;

  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - JAKARTA_OFFSET_MS);
}

/** Awal hari berikutnya, dipakai sebagai batas atas yang tidak ikut dihitung. */
export function endOfDay(at: Date): Date {
  return new Date(startOfDay(at).getTime() + DAY_MS);
}

/** Awal minggu yang memuat waktu tersebut. Minggu dimulai pada hari Senin. */
export function startOfWeek(at: Date): Date {
  const day = startOfDay(at);
  const weekday = (new Date(day.getTime() + JAKARTA_OFFSET_MS).getUTCDay() + 6) % 7;

  return new Date(day.getTime() - weekday * DAY_MS);
}

/** Awal minggu berikutnya. */
export function endOfWeek(at: Date): Date {
  return new Date(startOfWeek(at).getTime() + WEEK_MS);
}
