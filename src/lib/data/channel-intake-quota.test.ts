import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../db/testing";
import { processChannelEvent } from "./channel-intake";
import { listOrders } from "./orders";
import { createProduct } from "./products";
import { recordStockMovement } from "./stock";
import { activateGoldSubscription, FREE_WHATSAPP_ORDER_LIMIT } from "./subscription";

describe("kuota pesanan WhatsApp paket Free", () => {
  let test: TestDatabase;
  let productId: string;

  beforeAll(async () => {
    test = await createTestDatabase();
    const product = await createProduct(test.db, test.business.id, {
      name: "Beras kuota",
      unit: "kilogram",
      salePrice: 15_000,
      purchasePrice: 12_000,
      minimumStock: 2,
    });
    productId = product.id;
    await recordStockMovement(test.db, test.business.id, {
      productId,
      kind: "masuk",
      quantityChange: 50,
      reason: "Stok awal uji kuota",
    });
  }, 60_000);

  afterAll(async () => {
    await test.close();
  });

  it("menolak pesanan setelah sepuluh pesanan hari ini", async () => {
    for (let index = 1; index <= FREE_WHATSAPP_ORDER_LIMIT; index++) {
      const result = await processChannelEvent(test.db, test.business.id, {
        eventId: `kuota-${index}`,
        phoneNumber: "6281200000100",
        customerName: "Pelanggan kuota",
        body: `Pesan beras ${index}`,
        items: [{ productId, quantity: 1 }],
      });
      expect(result.orderId).toBeDefined();
    }

    const rejected = await processChannelEvent(test.db, test.business.id, {
      eventId: "kuota-11",
      phoneNumber: "6281200000100",
      customerName: "Pelanggan kuota",
      body: "Pesan beras kesebelas",
      items: [{ productId, quantity: 1 }],
    });

    expect(rejected.orderId).toBeUndefined();
    expect(rejected.replyFinal).toBe(true);
    expect(rejected.reply).toContain("Kuota");
    expect(await listOrders(test.db, test.business.id)).toHaveLength(
      FREE_WHATSAPP_ORDER_LIMIT,
    );
  });

  it("menerima pesanan lagi setelah paket Gold aktif", async () => {
    await activateGoldSubscription(test.db, test.business.id);

    const accepted = await processChannelEvent(test.db, test.business.id, {
      eventId: "kuota-gold",
      phoneNumber: "6281200000100",
      customerName: "Pelanggan kuota",
      body: "Pesan beras setelah Gold",
      items: [{ productId, quantity: 1 }],
    });

    expect(accepted.orderId).toBeDefined();
    expect(await listOrders(test.db, test.business.id)).toHaveLength(
      FREE_WHATSAPP_ORDER_LIMIT + 1,
    );
  });
});
