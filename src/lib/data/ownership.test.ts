import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../db/client";
import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { recordInboundMessage } from "./conversations";
import { findOrCreateCustomer } from "./customers";
import { createOrder } from "./orders";
import {
  assertConversationOwned,
  assertCustomerOwned,
  assertOrderOwned,
  assertProductsOwned,
  assertPurchaseOrderOwned,
  OwnershipError,
} from "./ownership";
import { createProduct } from "./products";
import { createPurchaseOrder } from "./purchase-orders";

type Fixture = {
  readonly businessId: string;
  readonly productId: string;
  readonly customerId: string;
  readonly conversationId: string;
  readonly orderId: string;
  readonly purchaseOrderId: string;
};

let test: TestDatabase;
let own: Fixture;
let other: Fixture;

/** Menyiapkan satu warung kecil berisi rujukan yang dapat diuji. */
const buildWarung = async (db: Database, businessId: string): Promise<Fixture> => {
  const product = await createProduct(db, businessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 13800,
    minimumStock: 10,
  });
  const customer = await findOrCreateCustomer(db, businessId, {
    name: "Bu Sari",
    phoneNumber: "081200000001",
  });
  const inbound = await recordInboundMessage(db, businessId, {
    channel: "app",
    phoneNumber: "081200000001",
    customerName: "Bu Sari",
    body: "Ada beras?",
  });
  const order = await createOrder(db, businessId, {
    conversationId: inbound.conversation.id,
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 1, unitPrice: 15000 }],
  });
  const draft = await createPurchaseOrder(db, businessId, {
    supplierName: "Pasar Induk",
    items: [{ productId: product.id, quantity: 5, estimatedPrice: 13800 }],
  });

  return {
    businessId,
    productId: product.id,
    customerId: customer.id,
    conversationId: inbound.conversation.id,
    orderId: order.order.id,
    purchaseOrderId: draft.order.id,
  };
};

beforeAll(async () => {
  test = await createTestDatabase();
  own = await buildWarung(test.db, test.business.id);
  other = await buildWarung(test.db, (await createSecondBusiness(test.db)).id);
}, 60_000);

afterAll(async () => {
  await test.close();
});

const missingKey = "00000000-0000-0000-0000-000000000000";

describe("pemeriksaan rujukan antar warung", () => {
  it("menerima rujukan milik warung sendiri", async () => {
    await expect(
      assertCustomerOwned(test.db, own.businessId, own.customerId),
    ).resolves.toBeUndefined();
    await expect(
      assertConversationOwned(test.db, own.businessId, own.conversationId),
    ).resolves.toBeUndefined();
    await expect(
      assertOrderOwned(test.db, own.businessId, own.orderId),
    ).resolves.toBeUndefined();
    await expect(
      assertPurchaseOrderOwned(test.db, own.businessId, own.purchaseOrderId),
    ).resolves.toBeUndefined();
    await expect(
      assertProductsOwned(test.db, own.businessId, [own.productId]),
    ).resolves.toBeUndefined();
  });

  it("menolak rujukan milik warung lain", async () => {
    await expect(
      assertCustomerOwned(test.db, own.businessId, other.customerId),
    ).rejects.toThrow(OwnershipError);
    await expect(
      assertConversationOwned(test.db, own.businessId, other.conversationId),
    ).rejects.toThrow(OwnershipError);
    await expect(
      assertOrderOwned(test.db, own.businessId, other.orderId),
    ).rejects.toThrow(OwnershipError);
    await expect(
      assertPurchaseOrderOwned(test.db, own.businessId, other.purchaseOrderId),
    ).rejects.toThrow(OwnershipError);
    await expect(
      assertProductsOwned(test.db, own.businessId, [other.productId]),
    ).rejects.toThrow(OwnershipError);
  });

  it("menolak kunci yang tidak ada dan kunci yang salah bentuk", async () => {
    await expect(
      assertCustomerOwned(test.db, own.businessId, missingKey),
    ).rejects.toThrow("Pelanggan tidak ditemukan pada warung ini");
    await expect(
      assertConversationOwned(test.db, own.businessId, "bukan kunci"),
    ).rejects.toThrow("Percakapan tidak ditemukan pada warung ini");
    await expect(
      assertOrderOwned(test.db, own.businessId, "bukan kunci"),
    ).rejects.toThrow("Orderan tidak ditemukan pada warung ini");
    await expect(
      assertPurchaseOrderOwned(test.db, own.businessId, "bukan kunci"),
    ).rejects.toThrow("Draft pesanan pembelian tidak ditemukan pada warung ini");
  });

  it("memeriksa sekumpulan produk sekaligus", async () => {
    await expect(
      assertProductsOwned(test.db, own.businessId, []),
    ).resolves.toBeUndefined();
    await expect(
      assertProductsOwned(test.db, own.businessId, [own.productId, own.productId]),
    ).resolves.toBeUndefined();

    /* Kunci milik warung lain disebutkan pada pesan galatnya. */
    await expect(
      assertProductsOwned(test.db, own.businessId, [own.productId, other.productId]),
    ).rejects.toThrow(other.productId);
    await expect(
      assertProductsOwned(test.db, own.businessId, ["bukan kunci"]),
    ).rejects.toThrow("Produk tidak ditemukan pada warung ini");
  });
});
