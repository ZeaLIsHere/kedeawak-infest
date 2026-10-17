import { formatNumber } from "./number";

/*
 * Uang disimpan sebagai bilangan bulat rupiah. Arah nilai, misalnya pengeluaran
 * atau kerugian, ditulis dengan kata oleh pemanggil, karena tanda minus
 * dilarang tampil di antarmuka.
 */

/** Menulis rupiah penuh, misalnya `Rp150.000`. */
export function formatRupiah(amount: number): string {
  return `Rp${formatNumber(Math.round(Math.abs(amount)))}`;
}
