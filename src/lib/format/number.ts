/*
 * Pemformatan angka menurut kebiasaan Indonesia: pemisah ribuan titik dan
 * pemisah desimal koma.
 *
 * Seluruh fungsi di berkas ini hanya mengurus besaran dan mengabaikan tanda
 * nilai. Arah sebuah nilai, misalnya pengeluaran atau kerugian, ditulis dengan
 * kata oleh pemanggil, karena tanda minus dilarang tampil di antarmuka.
 */

const THOUSAND_SEPARATOR = ".";
const DECIMAL_SEPARATOR = ",";

/** Menyisipkan pemisah ribuan pada deretan angka. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
}

/** Menulis bilangan bulat, misalnya `1.250`. */
export function formatNumber(value: number): string {
  return groupThousands(String(Math.trunc(Math.abs(value))));
}

/** Menulis bilangan berdesimal, misalnya `12,5`. */
export function formatDecimal(value: number, digits = 1): string {
  const [whole, fraction] = Math.abs(value).toFixed(digits).split(".");

  if (fraction === undefined) {
    return groupThousands(whole);
  }

  return `${groupThousands(whole)}${DECIMAL_SEPARATOR}${fraction}`;
}

/** Menulis persentase dengan kata, misalnya `12,5 persen`. */
export function formatPercent(value: number, digits = 1): string {
  return `${formatDecimal(value, digits)} persen`;
}
