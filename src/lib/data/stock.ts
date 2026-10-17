import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  products,
  stockAlerts,
  stockMovements,
  type Product,
  type StockAlert,
  type StockMovement,
} from "../db/schema";
import { assertProductsOwned, OwnershipError, type Queryable } from "./ownership";

/*
 * Stok hanya berubah lewat berkas ini.
 *
 * Setiap perubahan stok meninggalkan satu baris di `stock_movements`, dan kolom
 * `products.stock` diperbarui di dalam transaksi yang sama, sehingga keduanya
 * tidak pernah berbeda. Alert stok menipis ikut disesuaikan pada setiap
 * perubahan, sesuai aturan skema pada `docs/ARCHITECTURE.md` bagian 4.
 *
 * Stok baru dihitung dari nilai yang tersimpan, bukan dihitung ulang dari
 * seluruh pergerakan. Kolom `products.stock` adalah hasil perhitungan terakhir
 * yang dijaga di sini, sedangkan baris pergerakan adalah jejak auditnya.
 */

/** Data satu pergerakan stok. */
export type StockMovementInput = {
  readonly productId: string;
  readonly kind: StockMovement["kind"];
  readonly quantityChange: number;
  readonly reason: string;
};

/** Jejak pergerakan stok, terbaru lebih dulu. Dapat disaring menurut produk. */
export async function listStockMovements(
  db: Database,
  businessId: string,
  productId?: string,
): Promise<StockMovement[]> {
  const conditions = [eq(stockMovements.businessId, businessId)];

  if (productId !== undefined) {
    conditions.push(eq(stockMovements.productId, productId));
  }

  return db
    .select()
    .from(stockMovements)
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt));
}

/** Alert stok menipis. Dapat disaring menurut keadaannya. */
export async function listStockAlerts(
  db: Database,
  businessId: string,
  status?: StockAlert["status"],
): Promise<StockAlert[]> {
  const conditions = [eq(stockAlerts.businessId, businessId)];

  if (status !== undefined) {
    conditions.push(eq(stockAlerts.status, status));
  }

  return db
    .select()
    .from(stockAlerts)
    .where(and(...conditions))
    .orderBy(desc(stockAlerts.createdAt));
}

/**
 * Menyesuaikan alert stok menipis dengan keadaan stok terkini.
 *
 * Alert dibuat saat stok berada di bawah ambang minimum, dan ditutup begitu
 * stok kembali menyentuh ambang. Selama masih aktif, barisnya tidak diubah,
 * sehingga kolom `stock_at_alert` tetap memuat stok saat alert itu muncul.
 * Fungsi ini idempoten, jadi aman dipanggil berulang kali.
 */
export async function reconcileStockAlert(
  db: Queryable,
  businessId: string,
  product: Product,
): Promise<StockAlert | undefined> {
  const [active] = await db
    .select()
    .from(stockAlerts)
    .where(
      and(
        eq(stockAlerts.businessId, businessId),
        eq(stockAlerts.productId, product.id),
        eq(stockAlerts.status, "aktif"),
      ),
    )
    .limit(1);

  if (product.stock >= product.minimumStock) {
    if (active === undefined) {
      return undefined;
    }

    const [closed] = await db
      .update(stockAlerts)
      .set({ status: "selesai" })
      .where(and(eq(stockAlerts.businessId, businessId), eq(stockAlerts.id, active.id)))
      .returning();

    return closed;
  }

  if (active !== undefined) {
    return active;
  }

  const [created] = await db
    .insert(stockAlerts)
    .values({
      businessId,
      productId: product.id,
      stockAtAlert: product.stock,
      minimumStock: product.minimumStock,
    })
    .returning();

  return created;
}

/** Memeriksa bentuk pergerakan menurut jenisnya. */
function assertValidMovement(kind: StockMovement["kind"], quantityChange: number): void {
  if (!Number.isInteger(quantityChange) || quantityChange === 0) {
    throw new Error("Perubahan stok harus bilangan bulat dan tidak nol");
  }

  if (kind === "masuk" && quantityChange < 0) {
    throw new Error("Pergerakan masuk harus menambah stok");
  }

  if (kind === "keluar" && quantityChange > 0) {
    throw new Error("Pergerakan keluar harus mengurangi stok");
  }
}

/**
 * Menerapkan satu pergerakan stok tanpa membuka transaksi sendiri.
 *
 * Dipakai di dalam transaksi pemanggil, misalnya saat persetujuan draft
 * pesanan pembelian menambah stok beberapa barang sekaligus.
 */
export async function applyStockMovement(
  db: Queryable,
  businessId: string,
  input: StockMovementInput,
): Promise<StockMovement> {
  assertValidMovement(input.kind, input.quantityChange);
  await assertProductsOwned(db, businessId, [input.productId]);

  const [movement] = await db
    .insert(stockMovements)
    .values({
      businessId,
      productId: input.productId,
      kind: input.kind,
      quantityChange: input.quantityChange,
      reason: input.reason,
    })
    .returning();

  if (movement === undefined) {
    throw new Error("Pergerakan stok gagal dicatat");
  }

  /*
   * Stok baru dihitung oleh basis data, bukan dari nilai yang dibaca lebih
   * dulu. Dengan begitu dua pergerakan yang berjalan bersamaan tidak saling
   * menimpa, karena keduanya menghitung dari nilai yang sedang berlaku.
   */
  const [product] = await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${input.quantityChange}` })
    .where(and(eq(products.businessId, businessId), eq(products.id, input.productId)))
    .returning();

  if (product === undefined) {
    throw new OwnershipError("Produk tidak ditemukan pada warung ini");
  }

  if (product.stock < 0) {
    throw new Error("Stok tidak boleh menjadi negatif");
  }

  await reconcileStockAlert(db, businessId, product);

  return movement;
}

/** Mencatat satu pergerakan stok beserta pembaruan stoknya dalam satu transaksi. */
export async function recordStockMovement(
  db: Database,
  businessId: string,
  input: StockMovementInput,
): Promise<StockMovement> {
  return db.transaction((tx) => applyStockMovement(tx, businessId, input));
}
