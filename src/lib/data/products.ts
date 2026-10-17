import { and, asc, eq, lte, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { products, type Product } from "../db/schema";
import { isUuid } from "./ids";

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
    .where(eq(products.businessId, businessId))
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
        sql`lower(${products.name}) = lower(${trimmed})`,
      ),
    )
    .limit(1);

  return product;
}

/** Produk yang stoknya sudah menyentuh atau melewati ambang minimum. */
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
        lte(products.stock, products.minimumStock),
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

/** Mengubah data produk. Stok tidak ikut berubah. */
export async function updateProduct(
  db: Database,
  businessId: string,
  productId: string,
  input: ProductUpdate,
): Promise<Product | undefined> {
  const [product] = await db
    .update(products)
    .set(input)
    .where(and(eq(products.businessId, businessId), eq(products.id, productId)))
    .returning();

  return product;
}
