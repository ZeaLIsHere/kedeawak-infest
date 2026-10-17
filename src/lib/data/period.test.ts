import { describe, expect, it } from "vitest";

import {
  endOfDay,
  endOfWeek,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "./period";

/*
 * Waktu uji memakai Waktu Indonesia Barat, yaitu UTC+7. Tengah malam di Jakarta
 * sama dengan pukul 17.00 UTC pada hari sebelumnya.
 */
describe("batas hari dan minggu", () => {
  it("menetapkan awal hari menurut Waktu Indonesia Barat", () => {
    expect(startOfDay(new Date("2026-10-17T02:00:00Z")).toISOString()).toBe(
      "2026-10-16T17:00:00.000Z",
    );
    expect(startOfDay(new Date("2026-10-17T16:59:59Z")).toISOString()).toBe(
      "2026-10-16T17:00:00.000Z",
    );
    expect(startOfDay(new Date("2026-10-17T17:00:01Z")).toISOString()).toBe(
      "2026-10-17T17:00:00.000Z",
    );
  });

  it("mengembalikan waktu yang sama untuk awal hari", () => {
    const day = new Date("2026-10-16T17:00:00.000Z");

    expect(startOfDay(day).toISOString()).toBe(day.toISOString());
  });

  it("menjadikan awal hari berikutnya sebagai akhir hari", () => {
    const day = new Date("2026-10-17T02:00:00Z");

    expect(endOfDay(day).toISOString()).toBe("2026-10-17T17:00:00.000Z");
    expect(endOfDay(day).toISOString()).toBe(
      startOfDay(new Date("2026-10-17T17:00:00Z")).toISOString(),
    );
  });

  it("memulai minggu pada hari Senin", () => {
    /* 17 Oktober 2026 jatuh pada hari Sabtu, dan 12 Oktober 2026 pada hari Senin. */
    expect(startOfWeek(new Date("2026-10-17T02:00:00Z")).toISOString()).toBe(
      "2026-10-11T17:00:00.000Z",
    );
    expect(startOfWeek(new Date("2026-10-12T02:00:00Z")).toISOString()).toBe(
      "2026-10-11T17:00:00.000Z",
    );
    expect(startOfWeek(new Date("2026-10-18T02:00:00Z")).toISOString()).toBe(
      "2026-10-11T17:00:00.000Z",
    );
    expect(endOfWeek(new Date("2026-10-17T02:00:00Z")).toISOString()).toBe(
      "2026-10-18T17:00:00.000Z",
    );
  });
});

/*
 * Kunci tanggal dipakai pada alamat halaman laporan, misalnya
 * `/laporan?periode=harian&tanggal=2026-10-17`, sehingga kunci ini harus dapat
 * dibaca pengguna di bilah alamat. Bentuknya baku dan tidak diterjemahkan.
 */
describe("kunci tanggal", () => {
  it("menulis kunci tanggal menurut Waktu Indonesia Barat", () => {
    expect(toDateKey(new Date("2026-10-17T02:00:00Z"))).toBe("2026-10-17");
    expect(toDateKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");

    /* Pukul 17.00 UTC sudah masuk hari berikutnya di Jakarta. */
    expect(toDateKey(new Date("2026-10-17T17:00:00Z"))).toBe("2026-10-18");
    expect(toDateKey(new Date("2026-10-16T16:59:59Z"))).toBe("2026-10-16");
  });

  it("mengurai kunci tanggal menjadi tengah malam Waktu Indonesia Barat", () => {
    expect(parseDateKey("2026-10-17")?.toISOString()).toBe("2026-10-16T17:00:00.000Z");
    expect(parseDateKey("2026-01-01")?.toISOString()).toBe("2025-12-31T17:00:00.000Z");
  });

  it("mengembalikan kunci yang sama saat diurai lalu ditulis kembali", () => {
    const at = parseDateKey("2026-10-17") ?? new Date(0);

    expect(toDateKey(at)).toBe("2026-10-17");
    expect(toDateKey(startOfDay(at))).toBe("2026-10-17");
  });

  it("menolak kunci yang tidak sah tanpa melempar galat", () => {
    expect(parseDateKey(undefined)).toBeUndefined();
    expect(parseDateKey("")).toBeUndefined();
    expect(parseDateKey("17 Oktober 2026")).toBeUndefined();
    expect(parseDateKey("2026-10")).toBeUndefined();
    expect(parseDateKey("20261017")).toBeUndefined();
    expect(parseDateKey("2026-13-01")).toBeUndefined();
    expect(parseDateKey("2026-02-31")).toBeUndefined();
    expect(parseDateKey("2026-10-17T00:00:00Z")).toBeUndefined();
  });
});
