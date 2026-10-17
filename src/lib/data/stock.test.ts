import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { createProduct, findProduct, updateProduct } from "./products";
import { listStockAlerts, listStockMovements, recordStockMovement } from "./stock";

let test: TestDatabase;
let otherBusinessId: string;
let berasId: string;
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
  const otherBeras = await createProduct(test.db, otherBusinessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 14000,
    minimumStock: 5,
  });

  berasId = beras.id;
  otherBerasId = otherBeras.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

/** Stok terkini sebuah produk pada warung utama. */
const stockOf = async (productId: string) =>
  (await findProduct(test.db, test.business.id, productId))?.stock;

describe("pergerakan stok", () => {
  it("mencatat pergerakan masuk dan menambah stok", async () => {
    const movement = await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "masuk",
      quantityChange: 10,
      reason: "Stok awal dari pasar",
    });

    expect(movement.kind).toBe("masuk");
    expect(movement.quantityChange).toBe(10);
    expect(movement.reason).toBe("Stok awal dari pasar");
    expect(movement.productId).toBe(berasId);
    expect(await stockOf(berasId)).toBe(10);
    expect(await listStockAlerts(test.db, test.business.id, "aktif")).toEqual([]);
  });

  it("mengurangi stok lewat pergerakan keluar sampai di bawah ambang", async () => {
    await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "keluar",
      quantityChange: -6,
      reason: "Penjualan beras enam kilogram",
    });

    expect(await stockOf(berasId)).toBe(4);

    const active = await listStockAlerts(test.db, test.business.id, "aktif");

    expect(active).toHaveLength(1);
    expect(active[0]?.productId).toBe(berasId);
    expect(active[0]?.stockAtAlert).toBe(4);
    expect(active[0]?.minimumStock).toBe(5);
  });

  it("tidak membuat alert baru selama stok masih di bawah ambang", async () => {
    await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "keluar",
      quantityChange: -1,
      reason: "Penjualan beras satu kilogram",
    });

    const alerts = await listStockAlerts(test.db, test.business.id);

    expect(await stockOf(berasId)).toBe(3);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.status).toBe("aktif");
    expect(alerts[0]?.stockAtAlert).toBe(4);
  });

  it("menutup alert begitu stok kembali menyentuh ambang", async () => {
    await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "masuk",
      quantityChange: 2,
      reason: "Tambahan dari pasar",
    });

    const alerts = await listStockAlerts(test.db, test.business.id);

    expect(await stockOf(berasId)).toBe(5);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.status).toBe("selesai");
    expect(await listStockAlerts(test.db, test.business.id, "aktif")).toEqual([]);
  });

  it("membuat alert baru saat stok turun lagi setelah alert ditutup", async () => {
    await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "keluar",
      quantityChange: -1,
      reason: "Penjualan beras satu kilogram",
    });

    const alerts = await listStockAlerts(test.db, test.business.id);
    const active = await listStockAlerts(test.db, test.business.id, "aktif");

    expect(alerts).toHaveLength(2);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).not.toBe(alerts[1]?.id);
    expect(active[0]?.stockAtAlert).toBe(4);
  });

  it("menerima penyesuaian dua arah", async () => {
    await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "penyesuaian",
      quantityChange: 6,
      reason: "Hasil hitung ulang stok",
    });
    const corrected = await recordStockMovement(test.db, test.business.id, {
      productId: berasId,
      kind: "penyesuaian",
      quantityChange: -3,
      reason: "Selisih catatan dengan gudang",
    });

    expect(corrected.quantityChange).toBe(-3);
    expect(await stockOf(berasId)).toBe(7);
    expect(await listStockAlerts(test.db, test.business.id, "aktif")).toEqual([]);
  });

  it("menolak pergerakan yang tidak sah tanpa mengubah stok", async () => {
    const stock = await stockOf(berasId);

    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: berasId,
        kind: "masuk",
        quantityChange: 0,
        reason: "Percobaan kosong",
      }),
    ).rejects.toThrow("Perubahan stok harus bilangan bulat dan tidak nol");

    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: berasId,
        kind: "masuk",
        quantityChange: -2,
        reason: "Percobaan arah salah",
      }),
    ).rejects.toThrow("Pergerakan masuk harus menambah stok");

    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: berasId,
        kind: "keluar",
        quantityChange: 2,
        reason: "Percobaan arah salah",
      }),
    ).rejects.toThrow("Pergerakan keluar harus mengurangi stok");

    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: berasId,
        kind: "keluar",
        quantityChange: -100,
        reason: "Percobaan melebihi stok",
      }),
    ).rejects.toThrow("Stok tidak boleh menjadi negatif");

    expect(await stockOf(berasId)).toBe(stock);
    expect(await listStockMovements(test.db, test.business.id)).toHaveLength(7);
  });

  it("menolak produk warung lain dan produk yang tidak ada", async () => {
    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: otherBerasId,
        kind: "masuk",
        quantityChange: 5,
        reason: "Bukan milik warung ini",
      }),
    ).rejects.toThrow("Produk tidak ditemukan pada warung ini");

    await expect(
      recordStockMovement(test.db, test.business.id, {
        productId: "bukan kunci",
        kind: "masuk",
        quantityChange: 5,
        reason: "Kunci yang salah bentuk",
      }),
    ).rejects.toThrow("Produk tidak ditemukan pada warung ini");

    expect(await listStockMovements(test.db, test.business.id)).toHaveLength(7);
    expect(await listStockMovements(test.db, otherBusinessId)).toEqual([]);
    expect(await listStockAlerts(test.db, otherBusinessId)).toEqual([]);
  });

  it("mendaftar jejak pergerakan menurut produk, terbaru lebih dulu", async () => {
    const all = await listStockMovements(test.db, test.business.id);
    const filtered = await listStockMovements(test.db, test.business.id, berasId);

    expect(all).toHaveLength(7);
    expect(all[0]?.quantityChange).toBe(-3);
    expect(all[0]?.reason).toBe("Selisih catatan dengan gudang");
    expect(filtered).toHaveLength(7);
    expect(await listStockMovements(test.db, test.business.id, otherBerasId)).toEqual([]);
  });

  it("menyesuaikan alert saat ambang minimum diubah", async () => {
    const raised = await updateProduct(test.db, test.business.id, berasId, {
      minimumStock: 20,
    });

    expect(raised?.minimumStock).toBe(20);
    expect(raised?.stock).toBe(7);

    const active = await listStockAlerts(test.db, test.business.id, "aktif");

    expect(active).toHaveLength(1);
    expect(active[0]?.minimumStock).toBe(20);
    expect(active[0]?.stockAtAlert).toBe(7);
    expect(await listStockMovements(test.db, test.business.id)).toHaveLength(7);

    await updateProduct(test.db, test.business.id, berasId, { minimumStock: 5 });
    expect(await listStockAlerts(test.db, test.business.id, "aktif")).toEqual([]);
  });
});
