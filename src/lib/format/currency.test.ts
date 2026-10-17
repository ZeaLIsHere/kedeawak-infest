import { describe, expect, it } from "vitest";

import { formatRupiah } from "./currency";

/*
 * Uang disimpan sebagai bilangan bulat rupiah. Arah nilai, misalnya pengeluaran
 * atau kerugian, ditulis dengan kata oleh pemanggil, karena tanda minus
 * dilarang tampil di antarmuka.
 */
describe("format rupiah", () => {
  it("menulis rupiah tanpa spasi dan tanpa desimal", () => {
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(150000)).toBe("Rp150.000");
    expect(formatRupiah(1250000)).toBe("Rp1.250.000");
  });

  it("mengabaikan tanda pada nilai negatif", () => {
    expect(formatRupiah(-20000)).toBe("Rp20.000");
  });

  it("membulatkan nilai pecahan ke rupiah terdekat", () => {
    expect(formatRupiah(150000.4)).toBe("Rp150.000");
    expect(formatRupiah(150000.6)).toBe("Rp150.001");
  });

  it("tidak pernah menghasilkan tanda hubung", () => {
    expect(formatRupiah(-20000)).not.toContain("-");
  });
});
