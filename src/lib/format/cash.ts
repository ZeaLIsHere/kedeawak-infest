import { formatNumber } from "./number";

/*
 * Bantuan untuk kolom uang tunai. Nilai disimpan sebagai deretan angka saja,
 * lalu ditampilkan dengan pemisah ribuan agar mudah dibaca.
 */

/** Membuang karakter selain angka, termasuk pemisah ribuan, dan nol di depan. */
export function parseCashInput(value: string): string {
  return value
    .replace(/\D/gu, "")
    .replace(/^0+(?=\d)/u, "");
}

/** Menulis deretan angka sebagai nominal, misalnya `30.000`. */
export function formatCashInput(digits: string): string {
  return digits === "" ? "" : formatNumber(Number(digits));
}

const ROUNDING_STEPS = [20_000, 50_000, 100_000] as const;

/**
 * Nominal cepat untuk uang tunai: uang pas dan pembulatan ke atas pada
 * kelipatan 20.000, 50.000, serta 100.000. Nilai ganda hanya muncul sekali.
 */
export function buildCashSuggestions(total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return [];

  const values = new Set<number>([Math.ceil(total)]);
  for (const step of ROUNDING_STEPS) {
    values.add(Math.ceil(total / step) * step);
  }

  return [...values].sort((left, right) => left - right);
}
