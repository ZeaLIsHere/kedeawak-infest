import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  createBusiness,
  deleteAllBusinesses,
  findBusiness,
  getCurrentBusiness,
  updateBusinessChannel,
  updateBusinessProfile,
} from "./business";
import { createProduct, listProducts } from "./products";

let test: TestDatabase;
let otherBusinessId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("data warung", () => {
  it("mengambil warung yang sedang dipakai", async () => {
    const business = await getCurrentBusiness(test.db);

    expect(business?.id).toBe(test.business.id);
    expect(business?.name).toBe("Warung Uji");
    expect(business?.channelStatus).toBe("belum_diatur");
  });

  it("mengambil warung menurut kuncinya", async () => {
    expect((await findBusiness(test.db, test.business.id))?.name).toBe("Warung Uji");
    expect(await findBusiness(test.db, otherBusinessId)).toBeDefined();
    expect(
      await findBusiness(test.db, "00000000-0000-0000-0000-000000000000"),
    ).toBeUndefined();
  });

  it("mengubah nama dan jam buka", async () => {
    const updated = await updateBusinessProfile(test.db, test.business.id, {
      name: "Warung Bu Sari",
      opensAt: "05:30:00",
      closesAt: "22:00:00",
    });

    expect(updated?.name).toBe("Warung Bu Sari");
    expect(updated?.opensAt).toBe("05:30:00");
    expect((await getCurrentBusiness(test.db))?.name).toBe("Warung Bu Sari");
  });

  it("tidak mengubah warung lain", async () => {
    const other = await findBusiness(test.db, otherBusinessId);

    await updateBusinessProfile(test.db, test.business.id, { name: "Warung Utama" });

    expect((await findBusiness(test.db, otherBusinessId))?.name).toBe(other?.name);
  });

  it("menyimpan hasil pemeriksaan koneksi nomor", async () => {
    const checkedAt = new Date("2026-10-17T02:00:00.000Z");
    const updated = await updateBusinessChannel(test.db, test.business.id, {
      status: "terhubung",
      phoneNumber: "6281234567890",
      connectedAt: checkedAt,
      packageName: "free",
      quota: 250,
      checkedAt,
    });

    expect(updated?.channelStatus).toBe("terhubung");
    expect(updated?.channelPhoneNumber).toBe("6281234567890");
    expect(updated?.channelPackage).toBe("free");
    expect(updated?.channelQuota).toBe(250);
    expect(updated?.channelCheckedAt?.toISOString()).toBe(checkedAt.toISOString());
  });

  it("membersihkan simpanan status koneksi saat nomor diputuskan", async () => {
    const updated = await updateBusinessChannel(test.db, test.business.id, {
      status: "terputus",
      phoneNumber: null,
      connectedAt: null,
      packageName: null,
      quota: null,
      checkedAt: new Date("2026-10-17T03:00:00.000Z"),
    });

    expect(updated?.channelStatus).toBe("terputus");
    expect(updated?.channelPhoneNumber).toBeNull();
    expect(updated?.channelConnectedAt).toBeNull();
    expect(updated?.channelPackage).toBeNull();
    expect(updated?.channelQuota).toBeNull();
  });

  it("membuat warung baru dengan keadaan kanal belum diatur", async () => {
    const created = await createBusiness(test.db, {
      name: "Warung Baru",
      opensAt: "07:00:00",
      closesAt: "20:00:00",
    });

    expect(created.name).toBe("Warung Baru");
    expect(created.opensAt).toBe("07:00:00");
    expect(created.closesAt).toBe("20:00:00");
    expect(created.channelStatus).toBe("belum_diatur");
    expect((await findBusiness(test.db, created.id))?.name).toBe("Warung Baru");
  });

  it("menghapus seluruh warung beserta datanya", async () => {
    await createProduct(test.db, test.business.id, {
      name: "Beras",
      unit: "kilogram",
      salePrice: 15000,
      purchasePrice: 13800,
      minimumStock: 10,
    });

    const removed = await deleteAllBusinesses(test.db);

    expect(removed).toBe(3);
    expect(await getCurrentBusiness(test.db)).toBeUndefined();
    expect(await findBusiness(test.db, test.business.id)).toBeUndefined();
    expect(await listProducts(test.db, test.business.id)).toEqual([]);
  });
});
