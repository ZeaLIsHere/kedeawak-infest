import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createProduct, findProduct, listProducts } from "./products";
import { endOfDay, startOfDay } from "./period";
import { summarizeDay } from "./reports";
import { recordStockMovement } from "./stock";
import { listTransactions } from "./transactions";
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  findOrder,
  findOrderWithItems,
  listItemsForOrders,
  listOrders,
  orderTotal,
  updateOrderStatus,
} from "./orders";

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
  const otherBeras = await createProduct(test.db, otherBusinessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 14000,
    minimumStock: 5,
  });

  berasId = beras.id;
  gulaId = gula.id;
  otherBerasId = otherBeras.id;

  await recordStockMovement(test.db, test.business.id, {
    productId: berasId,
    kind: "masuk",
    quantityChange: 20,
    reason: "Stok awal",
  });
  await recordStockMovement(test.db, test.business.id, {
    productId: gulaId,
    kind: "masuk",
    quantityChange: 10,
    reason: "Stok awal",
  });
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("data orderan", () => {
  it("menghitung total dari rincian itemnya", () => {
    expect(orderTotal([{ productId: "a", quantity: 3, unitPrice: 15000 }])).toBe(45000);
    expect(orderTotal([])).toBe(0);
  });

  it("membuat orderan beserta rincian itemnya", async () => {
    const created = await createOrder(test.db, test.business.id, {
      items: [
        { productId: berasId, quantity: 5, unitPrice: 15000 },
        { productId: gulaId, quantity: 2, unitPrice: 16000 },
      ],
    });

    expect(created.order.total).toBe(107000);
    expect(created.order.status).toBe("baru");
    expect(created.items).toHaveLength(2);
    expect(created.items.every((item) => item.orderId === created.order.id)).toBe(true);
  });

  it("membuat orderan tanpa item dengan total nol", async () => {
    const created = await createOrder(test.db, test.business.id, { items: [] });

    expect(created.order.total).toBe(0);
    expect(created.items).toEqual([]);
  });

  it("menolak orderan yang memuat produk warung lain", async () => {
    const before = await listOrders(test.db, test.business.id);

    await expect(
      createOrder(test.db, test.business.id, {
        items: [{ productId: otherBerasId, quantity: 1, unitPrice: 15000 }],
      }),
    ).rejects.toThrow("Produk tidak ditemukan pada warung ini");

    expect(await listOrders(test.db, test.business.id)).toHaveLength(before.length);
  });

  it("membatalkan seluruh penulisan bila ada item yang gagal", async () => {
    const before = await listOrders(test.db, test.business.id);

    await expect(
      createOrder(test.db, test.business.id, {
        items: [
          { productId: berasId, quantity: 1, unitPrice: 15000 },
          {
            productId: "00000000-0000-0000-0000-000000000000",
            quantity: 1,
            unitPrice: 1000,
          },
        ],
      }),
    ).rejects.toThrow();

    expect(await listOrders(test.db, test.business.id)).toHaveLength(before.length);
  });

  it("mendaftar orderan menurut keadaannya dan membatasinya", async () => {
    const second = await createOrder(test.db, test.business.id, {
      items: [{ productId: berasId, quantity: 1, unitPrice: 15000 }],
    });

    await updateOrderStatus(test.db, test.business.id, second.order.id, "selesai");

    const all = await listOrders(test.db, test.business.id);
    const finished = await listOrders(test.db, test.business.id, { status: "selesai" });
    const limited = await listOrders(test.db, test.business.id, { limit: 1 });

    expect(all).toHaveLength(3);
    expect(finished.map((order) => order.id)).toEqual([second.order.id]);
    expect(limited).toHaveLength(1);
  });

  it("mengambil orderan beserta rincian itemnya", async () => {
    const order = (await listOrders(test.db, test.business.id)).at(-1);
    const found = await findOrderWithItems(test.db, test.business.id, order?.id ?? "");

    expect(found?.order.id).toBe(order?.id);
    expect(found?.items).toHaveLength(2);
  });

  it("mengambil rincian item beberapa orderan sekaligus", async () => {
    const orders = await listOrders(test.db, test.business.id);
    const items = await listItemsForOrders(
      test.db,
      test.business.id,
      orders.map((order) => order.id),
    );

    expect(items).toHaveLength(3);
    expect(await listItemsForOrders(test.db, test.business.id, [])).toEqual([]);
  });

  it("tidak mencampur orderan antar warung", async () => {
    const otherOrder = await createOrder(test.db, otherBusinessId, {
      items: [{ productId: otherBerasId, quantity: 2, unitPrice: 15000 }],
    });

    const own = await listOrders(test.db, test.business.id);

    expect(own.map((order) => order.id)).not.toContain(otherOrder.order.id);
    expect(
      await findOrder(test.db, test.business.id, otherOrder.order.id),
    ).toBeUndefined();
    expect(await listOrders(test.db, otherBusinessId)).toHaveLength(1);
    expect(await listProducts(test.db, test.business.id)).toHaveLength(2);
  });

  it("tidak mengubah keadaan orderan warung lain", async () => {
    const other = await listOrders(test.db, otherBusinessId);

    expect(
      await updateOrderStatus(test.db, test.business.id, other[0]?.id ?? "", "selesai"),
    ).toBeUndefined();
  });

  it("menyaring orderan menurut rentang waktu dengan batas atas tidak ikut", async () => {
    const at = new Date("2026-10-22T04:00:00.000Z");

    await createOrder(test.db, test.business.id, { items: [], createdAt: at });

    const memuat = (orders: readonly { createdAt: Date }[]) =>
      orders.some((order) => order.createdAt.getTime() === at.getTime());

    const hariYangSama = await listOrders(test.db, test.business.id, {
      from: startOfDay(at),
      to: endOfDay(at),
    });
    expect(memuat(hariYangSama)).toBe(true);

    const hariBerikutnya = await listOrders(test.db, test.business.id, {
      from: endOfDay(at),
      to: new Date(endOfDay(at).getTime() + 24 * 60 * 60 * 1000),
    });
    expect(memuat(hariBerikutnya)).toBe(false);

    const sebelumWaktuItu = await listOrders(test.db, test.business.id, {
      from: startOfDay(at),
      to: at,
    });
    expect(memuat(sebelumWaktuItu)).toBe(false);
  });

  it("mengonfirmasi orderan baru menjadi penjualan dan mengurangi stok", async () => {
    const created = await createOrder(test.db, test.business.id, {
      items: [{ productId: berasId, quantity: 3, unitPrice: 15000 }],
    });
    const before = await findProduct(test.db, test.business.id, berasId);

    const confirmed = await confirmOrder(
      test.db,
      test.business.id,
      created.order.id,
      "tunai",
    );

    expect(confirmed?.order.status).toBe("selesai");
    expect(confirmed?.total).toBe(45000);

    const after = await findProduct(test.db, test.business.id, berasId);
    expect(after?.stock).toBe((before?.stock ?? 0) - 3);

    const sales = await listTransactions(test.db, test.business.id, { kind: "sale" });
    expect(
      sales.some(
        (row) =>
          row.orderId === created.order.id &&
          row.amount === 45000 &&
          row.method === "tunai",
      ),
    ).toBe(true);

    const summary = await summarizeDay(test.db, test.business.id, new Date());
    expect(summary.sales).toBeGreaterThanOrEqual(45000);

    expect(
      await confirmOrder(test.db, test.business.id, created.order.id, "tunai"),
    ).toBeUndefined();
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(
      after?.stock,
    );
  });

  it("membatalkan orderan baru tanpa mengubah stok dan penjualan", async () => {
    const created = await createOrder(test.db, test.business.id, {
      items: [{ productId: berasId, quantity: 2, unitPrice: 15000 }],
    });
    const before = await findProduct(test.db, test.business.id, berasId);
    const salesBefore = await listTransactions(test.db, test.business.id, {
      kind: "sale",
    });

    const cancelled = await cancelOrder(test.db, test.business.id, created.order.id);

    expect(cancelled?.status).toBe("dibatalkan");
    expect((await findProduct(test.db, test.business.id, berasId))?.stock).toBe(
      before?.stock,
    );
    expect(
      await listTransactions(test.db, test.business.id, { kind: "sale" }),
    ).toHaveLength(salesBefore.length);
    expect(
      await cancelOrder(test.db, test.business.id, created.order.id),
    ).toBeUndefined();
  });

  it("menolak pembatalan orderan yang sudah dikonfirmasi", async () => {
    const created = await createOrder(test.db, test.business.id, {
      items: [{ productId: gulaId, quantity: 1, unitPrice: 16000 }],
    });
    await confirmOrder(test.db, test.business.id, created.order.id, "qris");

    expect(
      await cancelOrder(test.db, test.business.id, created.order.id),
    ).toBeUndefined();
  });
});
