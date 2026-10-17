import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createOrder } from "./orders";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "./period";
import { createProduct } from "./products";
import { listTopProducts, summarizeDay, summarizePeriod, summarizeWeek } from "./reports";
import { createTransaction } from "./transactions";

let test: TestDatabase;
let otherBusinessId: string;
let emptyBusinessId: string;

/** Sabtu 17 Oktober 2026 pukul 09.00 WIB. */
const day = new Date("2026-10-17T02:00:00.000Z");
/** Jumat 16 Oktober 2026 pukul 09.00 WIB, hari sebelumnya pada minggu yang sama. */
const previousDay = new Date("2026-10-16T02:00:00.000Z");

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
  emptyBusinessId = (await createSecondBusiness(test.db)).id;

  const beras = await createProduct(test.db, test.business.id, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 14000,
    minimumStock: 5,
  });
  const gula = await createProduct(test.db, test.business.id, {
    name: "Gula",
    unit: "kilogram",
    salePrice: 16000,
    purchasePrice: 15000,
    minimumStock: 3,
  });

  const transaction = async (
    kind: "sale" | "expense" | "debt",
    amount: number,
    occurredAt: Date,
  ) => {
    await createTransaction(test.db, test.business.id, {
      kind,
      description: "Catatan pengujian laporan",
      amount,
      source: "app",
      occurredAt,
    });
  };

  await transaction("sale", 50000, day);
  await transaction("expense", 20000, day);
  await transaction("debt", 15000, day);
  await transaction("sale", 10000, previousDay);
  /* Tepat pada tengah malam WIB, masih masuk hari Sabtu. */
  await transaction("sale", 7000, new Date("2026-10-16T17:00:00.000Z"));
  /* Satu detik sebelum tengah malam WIB, masih hari Jumat. */
  await transaction("sale", 9000, new Date("2026-10-16T16:59:59.000Z"));

  await createOrder(test.db, test.business.id, {
    createdAt: day,
    items: [
      { productId: beras.id, quantity: 5, unitPrice: 15000 },
      { productId: gula.id, quantity: 2, unitPrice: 16000 },
    ],
  });
  await createOrder(test.db, test.business.id, {
    createdAt: day,
    items: [{ productId: beras.id, quantity: 3, unitPrice: 15000 }],
  });
  await createOrder(test.db, test.business.id, {
    createdAt: previousDay,
    items: [{ productId: gula.id, quantity: 10, unitPrice: 16000 }],
  });
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("laporan keuangan", () => {
  it("meringkas penjualan, pengeluaran, hutang, dan laba satu hari", async () => {
    const summary = await summarizeDay(test.db, test.business.id, day);

    expect(summary.sales).toBe(57000);
    expect(summary.expenses).toBe(20000);
    expect(summary.debts).toBe(15000);
    expect(summary.profit).toBe(37000);
    expect(summary.transactionCount).toBe(4);
    expect(typeof summary.sales).toBe("number");
    expect(typeof summary.transactionCount).toBe("number");
  });

  it("menghitung hari menurut Waktu Indonesia Barat", async () => {
    const summary = await summarizeDay(test.db, test.business.id, previousDay);

    expect(summary.sales).toBe(19000);
    expect(summary.expenses).toBe(0);
    expect(summary.profit).toBe(19000);
    expect(summary.transactionCount).toBe(2);
  });

  it("meringkas satu minggu penuh mulai hari Senin", async () => {
    const summary = await summarizeWeek(test.db, test.business.id, day);

    expect(summary.sales).toBe(76000);
    expect(summary.expenses).toBe(20000);
    expect(summary.debts).toBe(15000);
    expect(summary.profit).toBe(56000);
    expect(summary.transactionCount).toBe(6);
  });

  it("memakai rentang setengah terbuka", async () => {
    const summary = await summarizePeriod(test.db, test.business.id, {
      from: startOfDay(day),
      to: endOfWeek(day),
    });

    expect(summary.sales).toBe(57000);

    const nextDay = await summarizePeriod(test.db, test.business.id, {
      from: endOfDay(day),
      to: endOfWeek(day),
    });

    expect(nextDay.transactionCount).toBe(0);
  });

  it("menjawab nol untuk periode tanpa transaksi", async () => {
    const summary = await summarizeDay(test.db, emptyBusinessId, day);

    expect(summary).toEqual({
      sales: 0,
      expenses: 0,
      debts: 0,
      profit: 0,
      transactionCount: 0,
    });
  });

  it("memisahkan catatan antar warung", async () => {
    await createTransaction(test.db, otherBusinessId, {
      kind: "sale",
      description: "Penjualan warung tetangga",
      amount: 99000,
      source: "whatsapp",
      occurredAt: day,
    });

    expect((await summarizeDay(test.db, otherBusinessId, day)).sales).toBe(99000);
    expect((await summarizeDay(test.db, test.business.id, day)).sales).toBe(57000);
  });

  it("mendaftar produk terlaris pada satu periode", async () => {
    const period = { from: startOfDay(day), to: endOfDay(day) };
    const top = await listTopProducts(test.db, test.business.id, period);

    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({
      name: "Beras",
      unit: "kilogram",
      quantity: 8,
      revenue: 120000,
    });
    expect(top[1]).toMatchObject({ name: "Gula", quantity: 2, revenue: 32000 });
    expect(typeof top[0]?.quantity).toBe("number");
  });

  it("mengikuti batas jumlah dan rentang waktu", async () => {
    const week = { from: startOfWeek(day), to: endOfWeek(day) };
    const limited = await listTopProducts(test.db, test.business.id, week, 1);

    expect(limited).toHaveLength(1);
    expect(limited[0]?.name).toBe("Gula");
    expect(limited[0]?.quantity).toBe(12);

    const empty = await listTopProducts(test.db, emptyBusinessId, {
      from: startOfWeek(day),
      to: endOfWeek(day),
    });

    expect(empty).toEqual([]);
  });
});
