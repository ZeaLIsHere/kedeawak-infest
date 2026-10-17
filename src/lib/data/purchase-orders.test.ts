import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createProduct, findProduct } from "./products";
import { listStockAlerts, listStockMovements } from "./stock";
import {
  createPurchaseOrder,
  decidePurchaseOrder,
  findPurchaseOrder,
  findPurchaseOrderWithItems,
  listPurchaseOrders,
  purchaseOrderTotal,
} from "./purchase-orders";

let test: TestDatabase;
let otherBusinessId: string;
let berasId: string;
let gulaId: string;
let otherBerasId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const beras = await createProduct(test.db, test.business.id, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 12000,
    minimumStock: 10,
  });
  const gula = await createProduct(test.db, test.business.id, {
    name: "Gula",
    unit: "kilogram",
    salePrice: 16000,
    purchasePrice: 13000,
    minimumStock: 5,
  });
  const otherBeras = await createProduct(test.db, otherBusinessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 12000,
    minimumStock: 10,
  });

  berasId = beras.id;
  gulaId = gula.id;
  otherBerasId = otherBeras.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("draft pesanan pembelian", () => {
  it("menghitung perkiraan nilai dari rincian itemnya", () => {
    expect(
      purchaseOrderTotal([{ productId: "a", quantity: 10, estimatedPrice: 12000 }]),
    ).toBe(120000);
    expect(purchaseOrderTotal([])).toBe(0);
  });

  it("membuat draft beserta rincian itemnya", async () => {
    const created = await createPurchaseOrder(test.db, test.business.id, {
      supplierName: "Pasar Induk",
      items: [
        { productId: berasId, quantity: 20, estimatedPrice: 12000 },
        { productId: gulaId, quantity: 10, estimatedPrice: 13000 },
      ],
    });

    expect(created.order.status).toBe("draft");
    expect(created.order.total).toBe(370000);
    expect(created.order.decidedAt).toBeNull();
    expect(created.items).toHaveLength(2);
    expect(created.items.every((item) => item.purchaseOrderId === created.order.id)).toBe(
      true,
    );
  });

  it("menerima draft tanpa item", async () => {
    const created = await createPurchaseOrder(test.db, test.business.id, {
      supplierName: "Pasar Induk",
      items: [],
    });

    expect(created.order.total).toBe(0);
    expect(created.items).toEqual([]);
  });

  it("menolak draft yang memuat produk warung lain", async () => {
    const before = await listPurchaseOrders(test.db, test.business.id);

    await expect(
      createPurchaseOrder(test.db, test.business.id, {
        supplierName: "Pasar Induk",
        items: [{ productId: otherBerasId, quantity: 1, estimatedPrice: 12000 }],
      }),
    ).rejects.toThrow("Produk tidak ditemukan pada warung ini");

    expect(await listPurchaseOrders(test.db, test.business.id)).toHaveLength(
      before.length,
    );
  });

  it("mengambil draft beserta rincian itemnya", async () => {
    const drafts = await listPurchaseOrders(test.db, test.business.id);
    const found = await findPurchaseOrderWithItems(
      test.db,
      test.business.id,
      drafts[1]?.id ?? "",
    );

    expect(found?.order.supplierName).toBe("Pasar Induk");
    expect(found?.items).toHaveLength(2);
    expect(
      await findPurchaseOrderWithItems(test.db, test.business.id, "bukan kunci"),
    ).toBeUndefined();
  });

  it("menyaring draft menurut keadaannya", async () => {
    const drafts = await listPurchaseOrders(test.db, test.business.id, {
      status: "draft",
    });
    const approved = await listPurchaseOrders(test.db, test.business.id, {
      status: "disetujui",
    });
    const limited = await listPurchaseOrders(test.db, test.business.id, { limit: 1 });

    expect(drafts).toHaveLength(2);
    expect(approved).toEqual([]);
    expect(limited).toHaveLength(1);
  });

  it("memutuskan draft sehingga keadaannya tidak dapat ditimpa", async () => {
    const draft = (await listPurchaseOrders(test.db, test.business.id)).find(
      (order) => order.total > 0,
    );
    const decided = await decidePurchaseOrder(
      test.db,
      test.business.id,
      draft?.id ?? "",
      "disetujui",
    );

    expect(decided?.status).toBe("disetujui");
    expect(decided?.decidedAt).not.toBeNull();
    expect(
      await decidePurchaseOrder(test.db, test.business.id, draft?.id ?? "", "ditolak"),
    ).toBeUndefined();
    expect(
      (await findPurchaseOrder(test.db, test.business.id, draft?.id ?? ""))?.status,
    ).toBe("disetujui");
  });

  it("menambah stok setiap item saat draft disetujui", async () => {
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(20);
    expect((await findProduct(test.db, test.business.id, gulaId))?.stock).toBe(10);

    const movements = await listStockMovements(test.db, test.business.id);

    expect(movements).toHaveLength(2);
    expect(
      movements.every(
        (movement) =>
          movement.kind === "masuk" &&
          movement.reason === "Pesanan pembelian dari Pasar Induk",
      ),
    ).toBe(true);
    expect(await listStockAlerts(test.db, test.business.id, "aktif")).toEqual([]);
  });

  it("tidak menambah stok saat draft ditolak", async () => {
    const before = await listStockMovements(test.db, test.business.id);
    const draft = await createPurchaseOrder(test.db, test.business.id, {
      supplierName: "Pasar Induk",
      items: [{ productId: berasId, quantity: 50, estimatedPrice: 12000 }],
    });
    const decided = await decidePurchaseOrder(
      test.db,
      test.business.id,
      draft.order.id,
      "ditolak",
    );

    expect(decided?.status).toBe("ditolak");
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(20);
    expect(await listStockMovements(test.db, test.business.id)).toHaveLength(
      before.length,
    );
  });

  it("tidak memutuskan draft warung lain", async () => {
    const other = await createPurchaseOrder(test.db, otherBusinessId, {
      supplierName: "Pasar Induk",
      items: [{ productId: otherBerasId, quantity: 5, estimatedPrice: 12000 }],
    });

    expect(
      await decidePurchaseOrder(test.db, test.business.id, other.order.id, "disetujui"),
    ).toBeUndefined();
    expect(
      await findPurchaseOrder(test.db, test.business.id, other.order.id),
    ).toBeUndefined();
    expect(
      (await findPurchaseOrder(test.db, otherBusinessId, other.order.id))?.status,
    ).toBe("draft");
    expect(await listPurchaseOrders(test.db, otherBusinessId)).toHaveLength(1);
    expect((await findProduct(test.db, otherBusinessId, otherBerasId))?.stock).toBe(0);
    expect(await listStockMovements(test.db, otherBusinessId)).toEqual([]);
  });
});
