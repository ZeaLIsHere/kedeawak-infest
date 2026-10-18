import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listApprovals } from "../data/approvals";
import { findBusiness } from "../data/business";
import { listCustomers, readCustomerName, readCustomerPhone } from "../data/customers";
import { listOrders } from "../data/orders";
import { listProducts, listArchivedProducts } from "../data/products";
import { listStockAlerts, listStockMovements } from "../data/stock";
import { listTransactions } from "../data/transactions";
import { businesses } from "./schema";
import { DEMO_BUSINESS_NAME, seedDemoData, type SeedResult } from "./seed";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
/** Sabtu 17 Oktober 2026 pukul 09.00 WIB. */
const now = new Date("2026-10-17T02:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
let seeded: SeedResult;

beforeAll(async () => {
  test = await createTestDatabase();
  seeded = await seedDemoData(test.db, { now });
}, 120_000);

afterAll(async () => {
  await test.close();
});

describe("data demo", () => {
  it("menyediakan produk arsip dan tiga jenis pembayaran nyata", async () => {
    const archived = await listArchivedProducts(test.db, seeded.businessId);
    expect(archived).toHaveLength(1);
    const sales = (await listTransactions(test.db, seeded.businessId)).filter(
      (row) => row.kind === "sale",
    );
    expect(new Set(sales.map((row) => row.method))).toEqual(
      new Set(["tunai", "transfer", "qris"]),
    );
  });
  it("menyiapkan satu warung dengan isi yang lengkap", async () => {
    const rows = await test.db.select().from(businesses);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(DEMO_BUSINESS_NAME);
    expect(rows[0]?.ownerName).toBe("Rina");
    expect(rows[0]?.businessType).toBe("Sembako dan kebutuhan harian");
    expect(rows[0]?.address).toBe("Jalan Melati nomor 12, Medan");
    expect(rows[0]?.channelStatus).toBe("belum_diatur");
    expect(seeded.products).toBe(20);
    expect(seeded.customers).toBe(6);
    expect(seeded.conversations).toBe(5);
    expect(seeded.orders).toBe(4);
    expect(seeded.transactions).toBeGreaterThanOrEqual(54);
    expect(seeded.stockMovements).toBeGreaterThanOrEqual(60);
    expect(seeded.activeAlerts).toBe(0);
    expect(seeded.pendingApprovals).toBe(0);
    expect(seeded.knowledgeChunks).toBe(6);
    expect(await listOrders(test.db, seeded.businessId)).toHaveLength(4);
  });

  it("mengisi riwayat beberapa minggu tanpa catatan di masa depan", async () => {
    const rows = await listTransactions(test.db, seeded.businessId);
    const times = rows.map((row) => row.occurredAt.getTime());
    const oldest = Math.min(...times);
    const newest = Math.max(...times);
    const days = new Set(rows.map((row) => row.occurredAt.toISOString().slice(0, 10)));

    expect(rows.length).toBeGreaterThanOrEqual(54);
    expect(newest).toBeLessThanOrEqual(now.getTime());
    expect(now.getTime() - oldest).toBeGreaterThanOrEqual(19 * DAY_MS);
    expect(days.size).toBeGreaterThanOrEqual(15);
    expect(new Set(rows.map((row) => row.kind))).toEqual(
      new Set(["sale", "expense", "debt"]),
    );
  });

  it("menjaga stok setiap produk sama dengan jumlah pergerakannya", async () => {
    const products = await listProducts(test.db, seeded.businessId);

    expect(products).toHaveLength(20);

    for (const product of products) {
      const movements = await listStockMovements(test.db, seeded.businessId, product.id);
      const total = movements.reduce((sum, movement) => sum + movement.quantityChange, 0);

      expect(movements.length).toBeGreaterThan(0);
      expect(total).toBe(product.stock);
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("tidak membuat alert stok atau aksi menunggu di awal", async () => {
    const products = await listProducts(test.db, seeded.businessId);

    expect(await listStockAlerts(test.db, seeded.businessId, "aktif")).toHaveLength(0);
    expect(await listApprovals(test.db, seeded.businessId, "menunggu")).toHaveLength(0);

    for (const product of products) {
      expect(product.stock).toBeGreaterThanOrEqual(product.minimumStock);
    }
  });

  it("menyimpan nama dan nomor pelanggan secara terenkripsi", async () => {
    const customers = await listCustomers(test.db, seeded.businessId);
    const names = customers.map((customer) => readCustomerName(customer));

    expect(customers).toHaveLength(6);
    expect(names).toContain("Bu Sari");

    for (const customer of customers) {
      expect(readCustomerName(customer)).toBeTruthy();
      expect(readCustomerName(customer)).not.toBe(customer.nameEncrypted);
      expect(customer.nameEncrypted).toContain("v1:");
      expect(customer.phoneNumberEncrypted).toContain("v1:");
      expect(customer.phoneNumberHash).toHaveLength(64);
      expect(readCustomerPhone(customer)).toMatch(/^(\+?62|0)\d{8,}$/u);
    }
  });

  it("mengganti seluruh data lama saat dijalankan ulang", async () => {
    const previousBusinessId = seeded.businessId;
    const previousTransactions = seeded.transactions;

    const again = await seedDemoData(test.db, { now });

    expect(again.businessId).not.toBe(previousBusinessId);
    expect(await findBusiness(test.db, previousBusinessId)).toBeUndefined();
    expect(await test.db.select().from(businesses)).toHaveLength(1);
    expect(again.products).toBe(20);
    expect(again.transactions).toBe(previousTransactions);
    expect(await listTransactions(test.db, previousBusinessId)).toEqual([]);
  });
});
