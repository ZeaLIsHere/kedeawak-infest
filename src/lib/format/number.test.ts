import { describe, expect, it } from "vitest";

import { formatDecimal, formatNumber, formatPercent } from "./number";

/*
 * Arah nilai selalu dinyatakan dengan kata oleh pemanggil, karena tanda
 * minus dilarang tampil di antarmuka. Karena itu seluruh pemformatan di sini
 * mengabaikan tanda dan hanya mengurus besaran.
 */
describe("format angka", () => {
  it("menulis bilangan bulat dengan pemisah ribuan titik", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(7)).toBe("7");
    expect(formatNumber(1250)).toBe("1.250");
    expect(formatNumber(1250000)).toBe("1.250.000");
  });

  it("mengabaikan tanda tanpa menuliskannya", () => {
    expect(formatNumber(-1250)).toBe("1.250");
    expect(formatDecimal(-12.5)).toBe("12,5");
  });

  it("menulis desimal dengan pemisah koma", () => {
    expect(formatDecimal(12.5)).toBe("12,5");
    expect(formatDecimal(12.55, 1)).toBe("12,6");
    expect(formatDecimal(12, 0)).toBe("12");
    expect(formatDecimal(0.4)).toBe("0,4");
    expect(formatDecimal(1250.5, 1)).toBe("1.250,5");
  });

  it("menulis persen dengan kata persen, bukan lambang", () => {
    expect(formatPercent(12.5)).toBe("12,5 persen");
    expect(formatPercent(0.4, 1)).toBe("0,4 persen");
    expect(formatPercent(100, 0)).toBe("100 persen");
  });

  it("tidak pernah menghasilkan tanda hubung", () => {
    const hasil = [formatNumber(-1250), formatDecimal(-12.5), formatPercent(-12.5)];

    for (const nilai of hasil) {
      expect(nilai).not.toContain("-");
    }
  });
});
