import { afterAll, beforeAll, expect, it } from "vitest";
import {
  createTestDatabase,
  createSecondBusiness,
  type TestDatabase,
} from "../db/testing";
import { orders, transactions, orderItems } from "../db/schema";
import { createSale } from "./sales";
import {
  createProduct,
  findProduct,
  listProducts,
  listArchivedProducts,
  saveProduct,
  archiveProduct,
  restoreProduct,
  findProductByName,
} from "./products";
import { listStockMovements, listStockAlerts } from "./stock";
import { draftFromStockAlert, decideApproval, listApprovalDetails } from "./approvals";
import { summarizePayments } from "./reports";
let test: TestDatabase;
beforeAll(async () => {
  test = await createTestDatabase();
}, 60000);
afterAll(async () => {
  await test.close();
});
const input = {
  name: "Beras kasir",
  unit: "kilogram",
  salePrice: 15000,
  purchasePrice: 12000,
  minimumStock: 5,
};
it("menyimpan stok awal dan perubahan beralasan secara atomik", async () => {
  const p = await saveProduct(test.db, test.business.id, { ...input, stock: 10 });
  expect(p.stock).toBe(10);
  await expect(
    saveProduct(test.db, test.business.id, { ...input, id: p.id, stock: 8 }),
  ).rejects.toThrow("alasan");
  expect((await findProduct(test.db, test.business.id, p.id))?.stock).toBe(10);
  await saveProduct(test.db, test.business.id, {
    ...input,
    id: p.id,
    stock: 8,
    reason: "Barang rusak",
  });
  expect(
    (await listStockMovements(test.db, test.business.id, p.id))
      .map((m) => m.quantityChange)
      .sort(),
  ).toEqual([-2, 10]);
});
it("mengambil harga server dan mencatat order transaksi serta stok bersama", async () => {
  const p = await findProductByName(test.db, test.business.id, input.name);
  const sale = await createSale(test.db, test.business.id, {
    items: [{ productId: p!.id, quantity: 2 }],
    method: "tunai",
    cashReceived: 50000,
  });
  expect(sale.total).toBe(30000);
  expect((await findProduct(test.db, test.business.id, p!.id))?.stock).toBe(6);
  expect((await test.db.select().from(orderItems))[0]?.unitPrice).toBe(15000);
  expect((await test.db.select().from(transactions))[0]?.method).toBe("tunai");
  const report = await summarizePayments(test.db, test.business.id, {
    from: new Date(0),
    to: new Date("2100-01-01"),
  });
  expect(report.tunai).toBe(30000);
});
it("membatalkan seluruh penjualan ketika salah satu stok kurang atau uang kurang", async () => {
  const p = await findProductByName(test.db, test.business.id, input.name);
  for (const [quantity, cashReceived] of [
    [7, 200000],
    [1, 1],
  ]) {
    await expect(
      createSale(test.db, test.business.id, {
        items: [{ productId: p!.id, quantity }],
        method: "tunai",
        cashReceived,
      }),
    ).rejects.toThrow();
  }
  expect(await test.db.select().from(orders)).toHaveLength(1);
  expect(await test.db.select().from(transactions)).toHaveLength(1);
  expect((await findProduct(test.db, test.business.id, p!.id))?.stock).toBe(6);
});
it("mengarsipkan tanpa menghapus riwayat dan menolak benturan nama saat pemulihan", async () => {
  const p = await findProductByName(test.db, test.business.id, input.name);
  await archiveProduct(test.db, test.business.id, p!.id);
  expect(await listProducts(test.db, test.business.id)).toHaveLength(0);
  expect(await findProductByName(test.db, test.business.id, input.name)).toBeUndefined();
  expect(await listArchivedProducts(test.db, test.business.id)).toHaveLength(1);
  await expect(
    createSale(test.db, test.business.id, {
      items: [{ productId: p!.id, quantity: 1 }],
      method: "qris",
    }),
  ).rejects.toThrow();
  const next = await createProduct(test.db, test.business.id, input);
  await expect(restoreProduct(test.db, test.business.id, p!.id)).rejects.toThrow("nama");
  await archiveProduct(test.db, test.business.id, next.id);
  await restoreProduct(test.db, test.business.id, p!.id);
  expect((await findProduct(test.db, test.business.id, p!.id))?.stock).toBe(6);
});
it("membuat draft tunggal lalu keputusan idempoten dan terisolasi", async () => {
  const p = await saveProduct(test.db, test.business.id, {
    ...input,
    name: "Gula alert",
    stock: 1,
  });
  const a = await draftFromStockAlert(test.db, test.business.id, p.id);
  const duplicate = await draftFromStockAlert(test.db, test.business.id, p.id);
  expect(a.id).toBe(duplicate.id);
  const details = await listApprovalDetails(test.db, test.business.id);
  expect(details[0]?.items[0]?.quantity).toBe(9);
  const other = await createSecondBusiness(test.db);
  expect(await decideApproval(test.db, other.id, a.id, "disetujui")).toBeUndefined();
  await decideApproval(test.db, test.business.id, a.id, "disetujui");
  await decideApproval(test.db, test.business.id, a.id, "disetujui");
  expect((await findProduct(test.db, test.business.id, p.id))?.stock).toBe(10);
  expect(
    (await listStockAlerts(test.db, test.business.id, "aktif")).filter(
      (x) => x.productId === p.id,
    ),
  ).toHaveLength(0);
});
it("kiriman ulang dengan kunci sama tidak mengurangi stok dua kali", async () => {
  const p = await saveProduct(test.db, test.business.id, {
    ...input,
    name: "Kopi pengulangan",
    stock: 5,
  });
  const requestId = crypto.randomUUID();
  const payload = {
    items: [{ productId: p.id, quantity: 2 }],
    method: "qris" as const,
    requestId,
  };
  const first = await createSale(test.db, test.business.id, payload);
  const repeat = await createSale(test.db, test.business.id, payload);
  expect(repeat.orderId).toBe(first.orderId);
  expect((await findProduct(test.db, test.business.id, p.id))?.stock).toBe(3);
  await expect(
    createSale(test.db, test.business.id, {
      ...payload,
      items: [{ productId: p.id, quantity: 1 }],
    }),
  ).rejects.toThrow("dipakai");
});
it("dua penjualan bersamaan tidak membuat stok negatif", async () => {
  const p = await saveProduct(test.db, test.business.id, {
    ...input,
    name: "Kopi bersamaan",
    stock: 3,
  });
  const payload = {
    items: [{ productId: p.id, quantity: 2 }],
    method: "transfer" as const,
  };
  const results = await Promise.allSettled([
    createSale(test.db, test.business.id, payload),
    createSale(test.db, test.business.id, payload),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await findProduct(test.db, test.business.id, p.id))?.stock).toBe(1);
});
