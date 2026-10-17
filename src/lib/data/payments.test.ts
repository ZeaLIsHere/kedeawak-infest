import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createOrder } from "./orders";
import {
  createPayment,
  findPayment,
  listPaymentsByStatus,
  listPaymentsForOrder,
  recordPaymentReading,
} from "./payments";
import { createProduct } from "./products";

let test: TestDatabase;
let otherBusinessId: string;
let orderId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const product = await createProduct(test.db, test.business.id, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 14000,
    minimumStock: 5,
  });
  const order = await createOrder(test.db, test.business.id, {
    items: [{ productId: product.id, quantity: 5, unitPrice: 15000 }],
  });

  orderId = order.order.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("data pembayaran", () => {
  it("menulis bukti pembayaran yang menunggu pencocokan", async () => {
    const payment = await createPayment(test.db, test.business.id, {
      orderId,
      expectedAmount: 75000,
      proofUrl: "https://contoh.test/bukti.jpg",
    });

    expect(payment.status).toBe("menunggu");
    expect(payment.expectedAmount).toBe(75000);
    expect(payment.readAmount).toBeNull();
    expect(payment.proofUrl).toBe("https://contoh.test/bukti.jpg");
  });

  it("menyimpan hasil pencocokan yang cocok", async () => {
    const pending = await listPaymentsByStatus(test.db, test.business.id, "menunggu");
    const matched = await recordPaymentReading(
      test.db,
      test.business.id,
      pending[0]?.id ?? "",
      {
        readAmount: 75000,
        status: "cocok",
      },
    );

    expect(matched?.status).toBe("cocok");
    expect(matched?.readAmount).toBe(75000);
  });

  it("mencatat bukti yang nilainya tidak cocok", async () => {
    const payment = await createPayment(test.db, test.business.id, {
      orderId,
      expectedAmount: 75000,
    });
    const reading = await recordPaymentReading(test.db, test.business.id, payment.id, {
      readAmount: 50000,
      status: "tidak_cocok",
    });

    expect(reading?.status).toBe("tidak_cocok");
    expect(reading?.readAmount).toBe(50000);
    expect(
      await listPaymentsByStatus(test.db, test.business.id, "tidak_cocok"),
    ).toHaveLength(1);
  });

  it("mendaftar bukti pembayaran sebuah orderan", async () => {
    const list = await listPaymentsForOrder(test.db, test.business.id, orderId);

    expect(list).toHaveLength(2);
    expect(list.every((payment) => payment.orderId === orderId)).toBe(true);
  });

  it("menolak bukti pembayaran untuk orderan warung lain", async () => {
    const otherProduct = await createProduct(test.db, otherBusinessId, {
      name: "Beras",
      unit: "kilogram",
      salePrice: 15000,
      purchasePrice: 14000,
      minimumStock: 5,
    });
    const otherOrder = await createOrder(test.db, otherBusinessId, {
      items: [{ productId: otherProduct.id, quantity: 1, unitPrice: 15000 }],
    });

    await expect(
      createPayment(test.db, test.business.id, {
        orderId: otherOrder.order.id,
        expectedAmount: 15000,
      }),
    ).rejects.toThrow();
  });

  it("tidak mengambil bukti pembayaran warung lain", async () => {
    const own = await listPaymentsForOrder(test.db, test.business.id, orderId);

    expect(await findPayment(test.db, otherBusinessId, own[0]?.id ?? "")).toBeUndefined();
    expect(
      await recordPaymentReading(test.db, otherBusinessId, own[0]?.id ?? "", {
        readAmount: 1,
        status: "cocok",
      }),
    ).toBeUndefined();
  });
});
