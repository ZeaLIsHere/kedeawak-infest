import { and, asc, eq, isNull, isNotNull, lt, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { products, type Product } from "../db/schema";
import { isUuid } from "./ids";
import { applyStockMovement, reconcileStockAlert } from "./stock";

/** Data pokok sebuah produk. Jumlah stok tidak diisi di sini, lihat `stock.ts`. */
export type ProductInput = {
  readonly name: string;
  readonly unit: string;
  readonly salePrice: number;
  readonly purchasePrice: number;
  readonly minimumStock: number;
};

/** Perubahan sebagian data produk. */
export type ProductUpdate = Partial<ProductInput>;

/*
 * Tidak ada fungsi yang mengubah `products.stock` di berkas ini. Stok hanya
 * berubah lewat `recordStockMovement` pada `stock.ts`, supaya setiap perubahan
 * meninggalkan jejak, sesuai aturan skema pada `docs/ARCHITECTURE.md` bagian 4.
 */

/** Seluruh produk warung, diurutkan menurut nama. */
export async function listProducts(db: Database, businessId: string): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(and(eq(products.businessId, businessId), isNull(products.archivedAt)))
    .orderBy(asc(products.name));
}

/** Mengambil satu produk. */
export async function findProduct(
  db: Database,
  businessId: string,
  productId: string,
): Promise<Product | undefined> {
  if (!isUuid(productId)) {
    return undefined;
  }

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
    .limit(1);

  return product;
}

/**
 * Mencari produk menurut namanya, tanpa membedakan huruf besar dan kecil.
 * Dipakai saat pesan pelanggan atau hasil pembacaan struk menyebut nama barang.
 */
export async function findProductByName(
  db: Database,
  businessId: string,
  name: string,
): Promise<Product | undefined> {
  const trimmed = name.trim();

  if (trimmed === "") {
    return undefined;
  }

  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.businessId, businessId),
        isNull(products.archivedAt),
        sql`lower(${products.name}) = lower(${trimmed})`,
      ),
    )
    .limit(1);

  return product;
}

/** Produk yang stoknya berada di bawah ambang minimum. */
export async function listLowStockProducts(
  db: Database,
  businessId: string,
): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.businessId, businessId),
        isNull(products.archivedAt),
        lt(products.stock, products.minimumStock),
      ),
    )
    .orderBy(asc(products.stock), asc(products.name));
}

/** Menambah produk baru. Stok awalnya nol dan diisi lewat pergerakan stok. */
export async function createProduct(
  db: Database,
  businessId: string,
  input: ProductInput,
): Promise<Product> {
  const [product] = await db
    .insert(products)
    .values({ ...input, businessId })
    .returning();

  if (product === undefined) {
    throw new Error("Produk gagal dibuat");
  }

  return product;
}

/**
 * Mengubah data produk. Stok tidak ikut berubah.
 *
 * Bila ambang minimum ikut diubah, alert stok menipis disesuaikan di dalam
 * transaksi yang sama. Tanpa penyesuaian itu, ambang baru yang lebih tinggi
 * tidak akan memunculkan alert sampai ada pergerakan stok berikutnya.
 */
export async function updateProduct(
  db: Database,
  businessId: string,
  productId: string,
  input: ProductUpdate,
): Promise<Product | undefined> {
  if (!isUuid(productId)) {
    return undefined;
  }

  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set(input)
      .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
      .returning();

    if (product === undefined) {
      return undefined;
    }

    if (input.minimumStock !== undefined) {
      await reconcileStockAlert(tx, businessId, product);
    }

    return product;
  });
}

export class ProductError extends Error {}
export type ProductSaveInput = ProductInput & {
  readonly id?: string;
  readonly stock: number;
  readonly reason?: string;
};
function validateProduct(input: ProductInput): void {
  if (
    !input.name.trim() ||
    !input.unit.trim() ||
    input.name.length > 120 ||
    input.unit.length > 40
  )
    throw new ProductError(
      "Nama dan satuan produk wajib diisi dengan panjang yang sesuai",
    );
  if (/[\p{Extended_Pictographic}\p{Dash_Punctuation}]/u.test(input.name + input.unit))
    throw new ProductError("Nama dan satuan tidak boleh memakai emoji atau tanda hubung");
  for (const value of [input.salePrice, input.purchasePrice, input.minimumStock])
    if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)
      throw new ProductError("Harga dan ambang stok harus bilangan bulat nol atau lebih");
}
export async function listArchivedProducts(
  db: Database,
  businessId: string,
): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(and(eq(products.businessId, businessId), isNotNull(products.archivedAt)))
    .orderBy(asc(products.name));
}
export async function saveProduct(
  db: Database,
  businessId: string,
  input: ProductSaveInput,
): Promise<Product> {
  validateProduct(input);
  if (!Number.isSafeInteger(input.stock) || input.stock < 0 || input.stock > 2147483647)
    throw new ProductError("Stok harus bilangan bulat nol atau lebih");
  if (input.id !== undefined && !isUuid(input.id))
    throw new ProductError("Produk tidak ditemukan");
  return db.transaction(async (tx) => {
    const values = {
      name: input.name.trim(),
      unit: input.unit.trim(),
      salePrice: input.salePrice,
      purchasePrice: input.purchasePrice,
      minimumStock: input.minimumStock,
    };
    const existing =
      input.id === undefined
        ? undefined
        : (
            await tx
              .select()
              .from(products)
              .where(
                and(
                  eq(products.businessId, businessId),
                  eq(products.id, input.id),
                  isNull(products.archivedAt),
                ),
              )
              .for("update")
          )[0];
    if (input.id !== undefined && !existing)
      throw new ProductError("Produk tidak ditemukan atau sudah diarsipkan");
    const [duplicate] = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          isNull(products.archivedAt),
          sql`lower(${products.name}) = lower(${values.name})`,
        ),
      );
    if (duplicate && duplicate.id !== existing?.id)
      throw new ProductError("Produk aktif dengan nama tersebut sudah ada");
    const difference = input.stock - (existing?.stock ?? 0);
    if (existing && difference !== 0 && !input.reason?.trim())
      throw new ProductError("Perubahan stok memerlukan alasan");
    const [product] = existing
      ? await tx
          .update(products)
          .set(values)
          .where(and(eq(products.businessId, businessId), eq(products.id, existing.id)))
          .returning()
      : await tx
          .insert(products)
          .values({ ...values, businessId })
          .returning();
    if (!product) throw new ProductError("Produk gagal disimpan");
    if (difference !== 0)
      await applyStockMovement(tx, businessId, {
        productId: product.id,
        kind: existing ? "penyesuaian" : "masuk",
        quantityChange: difference,
        reason: existing ? input.reason!.trim() : "Stok awal produk",
      });
    else await reconcileStockAlert(tx, businessId, product);
    const [updated] = await tx
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.id, product.id)));
    return updated!;
  });
}
export async function archiveProduct(
  db: Database,
  businessId: string,
  productId: string,
): Promise<Product | undefined> {
  if (!isUuid(productId)) return undefined;
  return db.transaction(async (tx) => {
    const [p] = await tx
      .update(products)
      .set({ archivedAt: new Date() })
      .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
      .returning();
    if (p) await reconcileStockAlert(tx, businessId, p);
    return p;
  });
}
export async function restoreProduct(
  db: Database,
  businessId: string,
  productId: string,
): Promise<Product | undefined> {
  if (!isUuid(productId)) return undefined;
  return db.transaction(async (tx) => {
    const [p] = await tx
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
      .for("update");
    if (!p) return undefined;
    const [same] = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          isNull(products.archivedAt),
          sql`lower(${products.name}) = lower(${p.name})`,
        ),
      );
    if (same && same.id !== p.id)
      throw new ProductError("Produk aktif dengan nama tersebut sudah ada");
    const [restored] = await tx
      .update(products)
      .set({ archivedAt: null })
      .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
      .returning();
    if (restored) await reconcileStockAlert(tx, businessId, restored);
    return restored;
  });
}
