import { describe, expect, it } from "vitest";

import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "./period";

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
