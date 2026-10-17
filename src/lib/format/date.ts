import { JAKARTA_OFFSET_MS } from "../data/period";

/*
 * Pemformatan tanggal dan waktu menurut Waktu Indonesia Barat, yaitu UTC+7.
 *
 * Seluruh perhitungan menggeser waktu lebih dulu lalu membaca bagian UTC, bukan
 * bagian waktu setempat, sehingga hasilnya sama di mesin mana pun, termasuk
 * server yang zona waktunya bukan WIB. Nama hari dan nama bulan disimpan
 * sebagai daftar tetap di sini karena antarmuka hanya memakai bahasa Indonesia.
 */

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

type WibParts = {
  readonly day: number;
  readonly month: number;
  readonly year: number;
  readonly hour: number;
  readonly minute: number;
  readonly dayOfWeek: number;
};

function toWib(at: Date): WibParts {
  const shifted = new Date(at.getTime() + JAKARTA_OFFSET_MS);

  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Menulis tanggal, misalnya `17 Oktober 2026`. */
export function formatDate(at: Date): string {
  const { day, month, year } = toWib(at);

  return `${day} ${MONTH_NAMES[month]} ${year}`;
}

/** Menulis tanggal beserta nama hari, misalnya `Sabtu, 17 Oktober 2026`. */
export function formatDateWithDay(at: Date): string {
  const { dayOfWeek } = toWib(at);

  return `${DAY_NAMES[dayOfWeek]}, ${formatDate(at)}`;
}

/** Menulis waktu, misalnya `14.30`. */
export function formatTime(at: Date): string {
  const { hour, minute } = toWib(at);

  return `${pad(hour)}.${pad(minute)}`;
}

/** Menulis tanggal dan waktu, misalnya `17 Oktober 2026, 14.30`. */
export function formatDateTime(at: Date): string {
  return `${formatDate(at)}, ${formatTime(at)}`;
}

/**
 * Menulis rentang tanggal yang kedua ujungnya ikut dihitung.
 *
 * Bagian yang sama tidak diulang: `12 sampai 18 Oktober 2026`, bukan
 * `12 Oktober 2026 sampai 18 Oktober 2026`.
 */
export function formatDateRange(from: Date, to: Date): string {
  const start = toWib(from);
  const end = toWib(to);

  if (start.year === end.year && start.month === end.month) {
    if (start.day === end.day) {
      return formatDate(from);
    }

    return `${start.day} sampai ${end.day} ${MONTH_NAMES[start.month]} ${start.year}`;
  }

  if (start.year === end.year) {
    return `${start.day} ${MONTH_NAMES[start.month]} sampai ${end.day} ${MONTH_NAMES[end.month]} ${start.year}`;
  }

  return `${formatDate(from)} sampai ${formatDate(to)}`;
}
