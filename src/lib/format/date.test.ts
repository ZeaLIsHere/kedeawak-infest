import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDateWithDay,
  formatTime,
} from "./date";

/*
 * Seluruh titik uji memakai waktu UTC, bukan waktu mesin, supaya terbukti
 * pemformatan tidak bergantung pada zona waktu komputer yang menjalankannya.
 * Warung berada di Waktu Indonesia Barat, yaitu UTC+7 tanpa waktu musim panas.
 */
const PAGI = new Date("2026-10-17T02:00:00.000Z");
const MALAM = new Date("2026-10-17T16:59:00.000Z");
const TENGAH_MALAM = new Date("2026-10-17T17:00:00.000Z");

describe("format tanggal", () => {
  it("menulis tanggal dengan nama bulan penuh", () => {
    expect(formatDate(PAGI)).toBe("17 Oktober 2026");
  });

  it("menulis nama hari sebelum tanggal bila diminta", () => {
    expect(formatDateWithDay(PAGI)).toBe("Sabtu, 17 Oktober 2026");
  });

  it("menulis waktu dengan pemisah titik", () => {
    expect(formatTime(PAGI)).toBe("09.00");
    expect(formatTime(MALAM)).toBe("23.59");
    expect(formatTime(TENGAH_MALAM)).toBe("00.00");
  });

  it("menggeser tanggal mengikuti Waktu Indonesia Barat", () => {
    expect(formatDate(TENGAH_MALAM)).toBe("18 Oktober 2026");
    expect(formatDateWithDay(TENGAH_MALAM)).toBe("Minggu, 18 Oktober 2026");
  });

  it("menulis tanggal dan waktu sekaligus", () => {
    expect(formatDateTime(PAGI)).toBe("17 Oktober 2026, 09.00");
  });

  it("menulis rentang dalam bulan yang sama", () => {
    expect(
      formatDateRange(
        new Date("2026-10-12T00:00:00.000+07:00"),
        new Date("2026-10-18T00:00:00.000+07:00"),
      ),
    ).toBe("12 sampai 18 Oktober 2026");
  });

  it("menulis rentang antar bulan dalam tahun yang sama", () => {
    expect(
      formatDateRange(
        new Date("2026-09-29T00:00:00.000+07:00"),
        new Date("2026-10-05T00:00:00.000+07:00"),
      ),
    ).toBe("29 September sampai 5 Oktober 2026");
  });

  it("menulis rentang antar tahun", () => {
    expect(
      formatDateRange(
        new Date("2025-12-29T00:00:00.000+07:00"),
        new Date("2026-01-04T00:00:00.000+07:00"),
      ),
    ).toBe("29 Desember 2025 sampai 4 Januari 2026");
  });

  it("menulis satu hari tanpa kata sampai", () => {
    expect(
      formatDateRange(
        new Date("2026-10-17T00:00:00.000+07:00"),
        new Date("2026-10-17T00:00:00.000+07:00"),
      ),
    ).toBe("17 Oktober 2026");
  });

  it("tidak pernah menghasilkan tanda hubung", () => {
    const hasil = [
      formatDate(PAGI),
      formatDateWithDay(PAGI),
      formatTime(PAGI),
      formatDateTime(PAGI),
      formatDateRange(
        new Date("2026-09-29T00:00:00.000+07:00"),
        new Date("2026-10-05T00:00:00.000+07:00"),
      ),
    ];

    for (const nilai of hasil) {
      expect(nilai).not.toContain("-");
    }
  });
});
