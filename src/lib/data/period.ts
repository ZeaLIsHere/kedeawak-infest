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

/*
 * Kunci tanggal adalah bentuk pendek satu hari Waktu Indonesia Barat, dipakai
 * pada alamat halaman laporan supaya pilihan periode dapat dibagikan lewat
 * tautan. Bentuknya baku, jadi tidak diterjemahkan dan tidak pernah tampil
 * sebagai teks antarmuka.
 */

/** Bagian tanggal yang dikenali, yaitu tahun, bulan, dan hari. */
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

const MONTHS_IN_YEAR = 12;

/** Menulis satu hari Waktu Indonesia Barat, misalnya `2026-10-17`. */
export function toDateKey(at: Date): string {
  return new Date(at.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Mengurai kunci tanggal menjadi awal hari Waktu Indonesia Barat.
 *
 * Menjawab `undefined` untuk kunci yang tidak dikenali maupun tanggal yang
 * tidak ada, misalnya `2026-02-31`, supaya pemanggil dapat kembali ke waktu
 * berjalan alih alih melempar galat ke halaman.
 */
export function parseDateKey(value: string | undefined): Date | undefined {
  const parts = value === undefined ? null : DATE_KEY_PATTERN.exec(value);

  if (parts === null) {
    return undefined;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);

  if (month < 1 || month > MONTHS_IN_YEAR) {
    return undefined;
  }

  /* Bulan pada Date dimulai dari nol, dan tanggal yang berlebih akan bergeser. */
  const midnight = new Date(Date.UTC(year, month - 1, day));

  if (
    midnight.getUTCFullYear() !== year ||
    midnight.getUTCMonth() !== month - 1 ||
    midnight.getUTCDate() !== day
  ) {
    return undefined;
  }

  return new Date(midnight.getTime() - JAKARTA_OFFSET_MS);
}
