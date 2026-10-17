import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../db/testing";
import { findProduct, saveProduct } from "./products";
import { summarizeDay } from "./reports";
import { createSale } from "./sales";
import { listStockMovements } from "./stock";
import { createTransaction, listTransactions } from "./transactions";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("alur data transaksi dan pengeluaran", () => {
  it("menyimpan penjualan, pengeluaran, stok, dan laporan dari sumber yang sama", async () => {
    const product = await saveProduct(test.db, test.business.id, {
      name: "Beras Uji",
      unit: "kilogram",
      salePrice: 15_000,
      purchasePrice: 12_000,
      minimumStock: 2,
      stock: 5,
    });

    await createSale(test.db, test.business.id, {
      items: [{ productId: product.id, quantity: 2 }],
      method: "qris",
    });

    await createTransaction(test.db, test.business.id, {
      kind: "expense",
      description: "Beli kantong plastik",
      amount: 5_000,
      source: "app",
    });

    const transactions = await listTransactions(test.db, test.business.id);
    expect(transactions.map((row) => row.kind).sort()).toEqual(["expense", "sale"]);

    const summary = await summarizeDay(test.db, test.business.id, new Date());
    expect(summary.sales).toBe(30_000);
    expect(summary.expenses).toBe(5_000);
    expect(summary.profit).toBe(25_000);
    expect(summary.transactionCount).toBe(2);

    const updated = await findProduct(test.db, test.business.id, product.id);
    expect(updated?.stock).toBe(3);

    const movements = await listStockMovements(test.db, test.business.id, product.id);
    const total = movements.reduce((sum, row) => sum + row.quantityChange, 0);
    expect(total).toBe(3);
  });
});
