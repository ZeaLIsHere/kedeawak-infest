import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "../db/testing";
import { revalidatePath } from "next/cache";
import { withCurrentBusiness } from "../data/server";
import { saveProduct } from "../data/products";
import { createSaleAction } from "./penjualan";
import { saveProductAction, archiveProductAction, restoreProductAction } from "./produk";
import { decideApprovalAction, draftFromAlertAction } from "./persetujuan";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../data/server", () => ({ withCurrentBusiness: vi.fn() }));
let test: TestDatabase;
beforeAll(async () => {
  test = await createTestDatabase();
  vi.mocked(withCurrentBusiness).mockImplementation(async (reader) =>
    reader(test.db, test.business.id),
  );
}, 60000);
afterAll(async () => {
  await test.close();
});
beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});
describe("aksi mutasi warung", () => {
  it("menolak form angka tidak sah sebelum menyimpan", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      name: "Beras aksi",
      unit: "kilogram",
      salePrice: "1.5",
      purchasePrice: "1000",
      minimumStock: "2",
      stock: "4",
    }))
      form.set(key, value);
    const result = await saveProductAction(form);
    expect(result.ok).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("menyimpan produk mengarsip memulihkan dan merevalidasi halaman terkait", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      name: "Produk aksi",
      unit: "bungkus",
      salePrice: "5000",
      purchasePrice: "3000",
      minimumStock: "2",
      stock: "4",
    }))
      form.set(key, value);
    const result = await saveProductAction(form);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(await archiveProductAction(result.productId)).toEqual({ ok: true });
    expect(await restoreProductAction(result.productId)).toEqual({ ok: true });
    expect(new Set(vi.mocked(revalidatePath).mock.calls.map(([path]) => path))).toEqual(
      new Set(["/kasir", "/stok", "/laporan", "/"]),
    );
  });
  it("mencatat penjualan satu kali saat request dikirim ulang", async () => {
    const p = await saveProduct(test.db, test.business.id, {
      name: "Kopi aksi",
      unit: "bungkus",
      salePrice: 5000,
      purchasePrice: 3000,
      minimumStock: 1,
      stock: 3,
    });
    const input = {
      items: [{ productId: p.id, quantity: 1 }],
      method: "qris" as const,
      requestId: crypto.randomUUID(),
    };
    const first = await createSaleAction(input);
    expect(first.ok).toBe(true);
    expect(await createSaleAction(input)).toEqual(first);
  });
  it("draft dan keputusan menulis lewat bisnis berjalan lalu menolak keputusan ulang", async () => {
    const p = await saveProduct(test.db, test.business.id, {
      name: "Gula aksi",
      unit: "bungkus",
      salePrice: 5000,
      purchasePrice: 3000,
      minimumStock: 2,
      stock: 1,
    });
    const created = await draftFromAlertAction(p.id);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);
    expect((await decideApprovalAction(created.approvalId, "disetujui")).ok).toBe(true);
    expect((await decideApprovalAction(created.approvalId, "ditolak")).ok).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith("/persetujuan");
  });
  it("menyembunyikan galat SQL dari pembaca bisnis", async () => {
    vi.mocked(withCurrentBusiness).mockRejectedValueOnce(
      new Error("password query insert secret"),
    );
    expect(await archiveProductAction(crypto.randomUUID())).toEqual({
      ok: false,
      error: "Perubahan belum tersimpan. Silakan coba kembali",
    });
  });
});
