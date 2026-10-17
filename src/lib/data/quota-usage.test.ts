import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { increaseQuotaUsage, readQuotaUsage, resetQuotaUsage } from "./quota-usage";

let test: TestDatabase;
let otherBusinessId: string;

/** Sabtu 17 Oktober 2026 pukul 09.00 WIB. */
const day = new Date("2026-10-17T02:00:00.000Z");
/** Sabtu 17 Oktober 2026 pukul 23.30 WIB, hari yang sama. */
const sameDayEvening = new Date("2026-10-17T16:30:00.000Z");
/** Minggu 18 Oktober 2026 pukul 00.30 WIB, hari berikutnya. */
const nextDay = new Date("2026-10-17T17:30:00.000Z");

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("pemakaian harian", () => {
  it("menjawab nol untuk hari yang belum tercatat", async () => {
    expect(await readQuotaUsage(test.db, test.business.id, day)).toBe(0);
  });

  it("menambah pemakaian dan mengembalikan jumlah terbaru", async () => {
    expect(await increaseQuotaUsage(test.db, test.business.id, day)).toBe(1);
    expect(await increaseQuotaUsage(test.db, test.business.id, day)).toBe(2);
    expect(await readQuotaUsage(test.db, test.business.id, day)).toBe(2);
    expect(typeof (await readQuotaUsage(test.db, test.business.id, day))).toBe("number");
  });

  it("menghitung hari menurut Waktu Indonesia Barat", async () => {
    expect(await increaseQuotaUsage(test.db, test.business.id, sameDayEvening)).toBe(3);
    expect(await increaseQuotaUsage(test.db, test.business.id, nextDay)).toBe(1);
    expect(await readQuotaUsage(test.db, test.business.id, day)).toBe(3);
  });

  it("mengembalikan pemakaian harian ke nol", async () => {
    expect(await resetQuotaUsage(test.db, test.business.id, day)).toBe(0);
    expect(await readQuotaUsage(test.db, test.business.id, day)).toBe(0);
    expect(await readQuotaUsage(test.db, test.business.id, nextDay)).toBe(1);
    expect(await resetQuotaUsage(test.db, test.business.id, nextDay)).toBe(0);
  });

  it("memisahkan pemakaian antar warung", async () => {
    expect(await readQuotaUsage(test.db, otherBusinessId, day)).toBe(0);
    expect(await increaseQuotaUsage(test.db, otherBusinessId, day)).toBe(1);
    expect(await readQuotaUsage(test.db, test.business.id, day)).toBe(0);
  });
});
