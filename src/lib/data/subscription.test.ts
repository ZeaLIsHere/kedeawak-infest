import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { recordInboundMessage } from "./conversations";
import { createOrder } from "./orders";
import { createProduct } from "./products";
import {
  activateGoldSubscription,
  canAcceptWhatsAppOrder,
  cancelSubscription,
  FREE_WHATSAPP_ORDER_LIMIT,
  readSubscription,
} from "./subscription";

let test: TestDatabase;
let productId: string;
let conversationId: string;
let customerId: string;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  test = await createTestDatabase();
  const product = await createProduct(test.db, test.business.id, {
    name: "Beras uji langganan",
    unit: "kilogram",
    salePrice: 15_000,
    purchasePrice: 12_000,
    minimumStock: 5,
  });
  productId = product.id;
  const inbound = await recordInboundMessage(test.db, test.business.id, {
    channel: "whatsapp",
    phoneNumber: "6281200000099",
    customerName: "Pelanggan langganan",
    body: "Pesan beras",
  });
  conversationId = inbound.conversation.id;
  customerId = inbound.customer.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

async function orderAt(createdAt?: Date): Promise<void> {
  await createOrder(test.db, test.business.id, {
    conversationId,
    customerId,
    items: [{ productId, quantity: 1, unitPrice: 15_000 }],
    ...(createdAt === undefined ? {} : { createdAt }),
  });
}

describe("langganan warung", () => {
  it("mulai dari paket Free dengan batas sepuluh pesanan", async () => {
    const status = await readSubscription(test.db, test.business.id);

    expect(status).toMatchObject({
      tier: "free",
      active: false,
      whatsappOrdersToday: 0,
      whatsappOrderLimit: FREE_WHATSAPP_ORDER_LIMIT,
      whatsappOrdersRemaining: FREE_WHATSAPP_ORDER_LIMIT,
    });
    expect(await canAcceptWhatsAppOrder(test.db, test.business.id)).toBe(true);
  });

  it("menghitung hanya pesanan WhatsApp pada hari berjalan", async () => {
    await orderAt();
    await orderAt(new Date(Date.now() - DAY_MS));
    await createOrder(test.db, test.business.id, {
      items: [{ productId, quantity: 1, unitPrice: 15_000 }],
    });

    const status = await readSubscription(test.db, test.business.id);

    expect(status?.whatsappOrdersToday).toBe(1);
    expect(status?.whatsappOrdersRemaining).toBe(FREE_WHATSAPP_ORDER_LIMIT - 1);
  });

  it("menolak pesanan setelah batas Free tercapai", async () => {
    for (let index = 1; index < FREE_WHATSAPP_ORDER_LIMIT; index++) {
      await orderAt();
    }

    const status = await readSubscription(test.db, test.business.id);

    expect(status?.whatsappOrdersToday).toBe(FREE_WHATSAPP_ORDER_LIMIT);
    expect(status?.whatsappOrdersRemaining).toBe(0);
    expect(await canAcceptWhatsAppOrder(test.db, test.business.id)).toBe(false);
  });

  it("membuka pesanan tanpa batas dan fitur Gold setelah pembelian", async () => {
    const status = await activateGoldSubscription(test.db, test.business.id);
    const now = Date.now();

    expect(status?.tier).toBe("gold");
    expect(status?.active).toBe(true);
    expect(status?.whatsappOrderLimit).toBeNull();
    expect(status?.whatsappOrdersRemaining).toBeNull();
    expect(status?.expiresAt?.getTime()).toBeGreaterThan(now + 29 * DAY_MS);
    expect(await canAcceptWhatsAppOrder(test.db, test.business.id)).toBe(true);
  });

  it("kembali ke Free setelah masa berlaku habis", async () => {
    const now = new Date();
    const status = await readSubscription(
      test.db,
      test.business.id,
      new Date(now.getTime() + 31 * DAY_MS),
    );

    expect(status?.tier).toBe("free");
    expect(status?.active).toBe(false);
    expect(status?.whatsappOrderLimit).toBe(FREE_WHATSAPP_ORDER_LIMIT);
  });

  it("mengembalikan warung ke Free saat langganan dihapus", async () => {
    const status = await cancelSubscription(test.db, test.business.id);

    expect(status).toMatchObject({
      tier: "free",
      active: false,
      startedAt: null,
      expiresAt: null,
      whatsappOrderLimit: FREE_WHATSAPP_ORDER_LIMIT,
    });
  });

  it("tidak mengubah langganan warung lain", async () => {
    const other = await createSecondBusiness(test.db, "Warung lain");

    await activateGoldSubscription(test.db, test.business.id);

    expect(await readSubscription(test.db, other.id)).toMatchObject({
      tier: "free",
      active: false,
    });
  });
});
