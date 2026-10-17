import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createCustomer } from "./customers";
import { endOfDay, startOfDay } from "./period";
import { summarizePeriod } from "./reports";
import { createTransaction, findTransaction, listTransactions } from "./transactions";

let test: TestDatabase;
let otherBusinessId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

const day = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

describe("data transaksi", () => {
  it("menulis penjualan dengan nilai yang dibutuhkan laporan", async () => {
    const transaction = await createTransaction(test.db, test.business.id, {
      kind: "sale",
      description: "Penjualan beras 5 kilogram",
      amount: 75000,
      source: "app",
      occurredAt: day("2026-10-15"),
    });

    expect(transaction.kind).toBe("sale");
    expect(transaction.amount).toBe(75000);
    expect(transaction.customerId).toBeNull();
    expect(transaction.confidence).toBeNull();
    expect(transaction.proofUrl).toBeNull();
  });

  it("menulis pengeluaran dan hutang pelanggan", async () => {
    const expense = await createTransaction(test.db, test.business.id, {
      kind: "expense",
      description: "Beli gas tiga kilogram",
      amount: 25000,
      source: "struk",
      confidence: 82,
      proofUrl: "https://contoh.test/struk.jpg",
      occurredAt: day("2026-10-16"),
    });

    const debt = await createTransaction(test.db, otherBusinessId, {
      kind: "debt",
      description: "Hutang Bu Sari",
      amount: 30000,
      source: "whatsapp",
      occurredAt: day("2026-10-16"),
    });

    expect(expense.kind).toBe("expense");
    expect(expense.confidence).toBe(82);
    expect(expense.proofUrl).toBe("https://contoh.test/struk.jpg");
    expect(debt.kind).toBe("debt");
  });

  it("memakai waktu sekarang bila waktu kejadian tidak diisi", async () => {
    const before = Date.now();
    const transaction = await createTransaction(test.db, test.business.id, {
      kind: "sale",
      description: "Penjualan kopi",
      amount: 5000,
      source: "app",
    });

    expect(transaction.occurredAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("mendaftar transaksi satu warung saja", async () => {
    const list = await listTransactions(test.db, test.business.id);

    expect(list).toHaveLength(3);
    expect(list.every((transaction) => transaction.businessId === test.business.id)).toBe(
      true,
    );
  });

  it("menyaring transaksi menurut rentang waktu", async () => {
    const list = await listTransactions(test.db, test.business.id, {
      from: day("2026-10-16"),
      to: new Date("2026-10-16T23:59:59.999Z"),
    });

    expect(list.map((transaction) => transaction.kind)).toEqual(["expense"]);
  });

  it("menyaring transaksi menurut jenisnya", async () => {
    const list = await listTransactions(test.db, test.business.id, { kind: "sale" });

    expect(list).toHaveLength(2);
    expect(list.every((transaction) => transaction.kind === "sale")).toBe(true);
  });

  it("mengurutkan transaksi dari yang terbaru", async () => {
    const list = await listTransactions(test.db, test.business.id);
    const times = list.map((transaction) => transaction.occurredAt.getTime());

    expect([...times].sort((left, right) => right - left)).toEqual(times);
  });

  it("mengambil satu transaksi dan menolak kunci warung lain", async () => {
    const [first] = await listTransactions(test.db, test.business.id);

    expect((await findTransaction(test.db, test.business.id, first?.id ?? ""))?.id).toBe(
      first?.id,
    );
    expect(
      await findTransaction(test.db, otherBusinessId, first?.id ?? ""),
    ).toBeUndefined();
  });

  it("menyimpan jumlah sebagai bilangan bulat rupiah penuh", async () => {
    const transaction = await createTransaction(test.db, test.business.id, {
      kind: "sale",
      description: "Penjualan telur",
      amount: 27500,
      source: "app",
    });

    expect(Number.isInteger(transaction.amount)).toBe(true);
    expect(transaction.amount).toBe(27500);
  });

  it("menolak hutang yang menunjuk pelanggan warung lain", async () => {
    const otherCustomer = await createCustomer(test.db, otherBusinessId, {
      name: "Pelanggan Tetangga",
      phoneNumber: "081211112222",
    });

    await expect(
      createTransaction(test.db, test.business.id, {
        kind: "debt",
        description: "Hutang bukan milik warung ini",
        amount: 10000,
        source: "whatsapp",
        customerId: otherCustomer.id,
      }),
    ).rejects.toThrow("Pelanggan tidak ditemukan pada warung ini");
  });

  it("menghitung transaksi tepat pada batas periode satu kali saja", async () => {
    const at = new Date("2026-10-20T03:00:00.000Z");
    const period = { from: startOfDay(at), to: endOfDay(at) };

    await createTransaction(test.db, test.business.id, {
      kind: "sale",
      description: "Penjualan tepat awal hari menurut WIB",
      amount: 10000,
      source: "app",
      occurredAt: period.from,
    });

    await createTransaction(test.db, test.business.id, {
      kind: "sale",
      description: "Penjualan tepat awal hari berikutnya menurut WIB",
      amount: 20000,
      source: "app",
      occurredAt: period.to,
    });

    const list = await listTransactions(test.db, test.business.id, period);
    const descriptions = list.map((transaction) => transaction.description);

    expect(descriptions).toContain("Penjualan tepat awal hari menurut WIB");
    expect(descriptions).not.toContain(
      "Penjualan tepat awal hari berikutnya menurut WIB",
    );
  });

  it("menyamakan daftar transaksi dengan ringkasan periode", async () => {
    const at = new Date("2026-10-20T03:00:00.000Z");
    const period = { from: startOfDay(at), to: endOfDay(at) };

    const list = await listTransactions(test.db, test.business.id, period);
    const summary = await summarizePeriod(test.db, test.business.id, period);

    const sales = list
      .filter((transaction) => transaction.kind === "sale")
      .reduce((total, transaction) => total + transaction.amount, 0);

    expect(sales).toBe(summary.sales);
    expect(list).toHaveLength(summary.transactionCount);
  });
});
