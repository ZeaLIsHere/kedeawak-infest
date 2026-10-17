import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { recordInboundMessage } from "./conversations";
import {
  createCustomer,
  deleteCustomerData,
  findCustomerByPhone,
  findOrCreateCustomer,
  listCustomers,
  readCustomerName,
  readCustomerPhone,
  updateCustomer,
} from "./customers";

let test: TestDatabase;
let otherBusinessId: string;
let sariId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const sari = await createCustomer(test.db, test.business.id, {
    name: "Bu Sari",
    phoneNumber: "081234567890",
  });

  sariId = sari.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("data pelanggan", () => {
  it("menyimpan nama dan nomor dalam bentuk terenkripsi", async () => {
    const customer = await findCustomerByPhone(test.db, test.business.id, "081234567890");

    expect(customer?.nameEncrypted).not.toBeNull();
    expect(customer?.nameEncrypted).not.toContain("Bu Sari");
    expect(customer?.phoneNumberEncrypted).not.toContain("081234567890");
    expect(customer?.phoneNumberHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(readCustomerName(customer ?? ({} as never))).toBe("Bu Sari");
    expect(readCustomerPhone(customer ?? ({} as never))).toBe("081234567890");
  });

  it("menerima pelanggan tanpa nama", async () => {
    const customer = await createCustomer(test.db, test.business.id, {
      name: null,
      phoneNumber: "081200000002",
    });

    expect(customer.nameEncrypted).toBeNull();
    expect(readCustomerName(customer)).toBeNull();
  });

  it("mencari pelanggan dari penulisan nomor yang berbeda", async () => {
    const forms = ["081234567890", "6281234567890", "+62 812 3456 7890"];

    for (const form of forms) {
      const found = await findCustomerByPhone(test.db, test.business.id, form);

      expect(found?.id).toBe(sariId);
    }
  });

  it("tidak menemukan pelanggan dari warung lain", async () => {
    expect(
      await findCustomerByPhone(test.db, otherBusinessId, "081234567890"),
    ).toBeUndefined();
    expect(await listCustomers(test.db, otherBusinessId)).toEqual([]);
  });

  it("memakai pelanggan yang sudah ada saat nomornya sama", async () => {
    const found = await findOrCreateCustomer(test.db, test.business.id, {
      name: "Bu Sari",
      phoneNumber: "6281234567890",
    });

    expect(found.id).toBe(sariId);
    expect(await listCustomers(test.db, test.business.id)).toHaveLength(2);
  });

  it("membuat pelanggan terpisah pada warung berbeda untuk nomor yang sama", async () => {
    const created = await findOrCreateCustomer(test.db, otherBusinessId, {
      name: "Bu Sari",
      phoneNumber: "081234567890",
    });

    expect(created.id).not.toBe(sariId);
    expect(created.businessId).toBe(otherBusinessId);
    expect(await listCustomers(test.db, otherBusinessId)).toHaveLength(1);
  });

  it("mengubah nama dan nomor pelanggan", async () => {
    const updated = await updateCustomer(test.db, test.business.id, sariId, {
      name: "Bu Sari Wati",
      phoneNumber: "081234567899",
    });

    expect(readCustomerName(updated ?? ({} as never))).toBe("Bu Sari Wati");
    expect(
      (await findCustomerByPhone(test.db, test.business.id, "081234567899"))?.id,
    ).toBe(sariId);
    expect(
      await findCustomerByPhone(test.db, test.business.id, "081234567890"),
    ).toBeUndefined();
  });

  it("tidak mengubah pelanggan warung lain", async () => {
    const other = await findCustomerByPhone(test.db, otherBusinessId, "081234567890");

    expect(
      await updateCustomer(test.db, test.business.id, other?.id ?? "", {
        name: "Bukan Miliknya",
        phoneNumber: "081200000009",
      }),
    ).toBeUndefined();
  });

  it("menghapus data pelanggan beserta rujukannya pada percakapan", async () => {
    const phoneNumber = "081200000003";
    const inbound = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber,
      customerName: "Pak Budi",
      body: "Mau pesan beras",
    });

    expect(await deleteCustomerData(test.db, test.business.id, inbound.customer.id)).toBe(
      true,
    );
    expect(
      await findCustomerByPhone(test.db, test.business.id, phoneNumber),
    ).toBeUndefined();

    const next = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber,
      body: "Pesan berikutnya",
    });

    expect(next.conversation.id).toBe(inbound.conversation.id);
    expect(next.conversation.customerId).toBe(next.customer.id);
    expect(next.customer.id).not.toBe(inbound.customer.id);
    expect(next.message.body).toBe("Pesan berikutnya");
  });

  it("tidak menghapus pelanggan warung lain", async () => {
    const other = await findCustomerByPhone(test.db, otherBusinessId, "081234567890");

    expect(await deleteCustomerData(test.db, test.business.id, other?.id ?? "")).toBe(
      false,
    );
    expect(
      await findCustomerByPhone(test.db, otherBusinessId, "081234567890"),
    ).toBeDefined();
  });
});
