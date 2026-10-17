import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../db/testing";
import { updateBusinessProfile } from "../data/business";
import { getBusinessContext } from "./rag";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
  await updateBusinessProfile(test.db, test.business.id, {
    name: "Warung Sembako Bu Rina",
    ownerName: "Rina",
    businessType: "Sembako dan kebutuhan harian",
    address: "Jalan Melati nomor 12, Medan",
    phoneNumber: "081234567890",
    description: "Melayani pesanan WhatsApp dan antar ke kampung sekitar.",
    opensAt: "06:00:00",
    closesAt: "21:00:00",
  });
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("konteks bisnis untuk agen", () => {
  it("mengirim profil pemilik dan usaha", async () => {
    const context = await getBusinessContext(test.db, test.business.id);

    expect(context.business).toMatchObject({
      name: "Warung Sembako Bu Rina",
      ownerName: "Rina",
      businessType: "Sembako dan kebutuhan harian",
      address: "Jalan Melati nomor 12, Medan",
      phoneNumber: "081234567890",
      description: "Melayani pesanan WhatsApp dan antar ke kampung sekitar.",
      opensAt: "06:00:00",
      closesAt: "21:00:00",
    });
  });
});
