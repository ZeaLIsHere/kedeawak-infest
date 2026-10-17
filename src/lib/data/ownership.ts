import { and, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "../db/schema";
import { conversations, customers, orders, products, purchaseOrders } from "../db/schema";
import { isUuid } from "./ids";

/*
 * Pemeriksaan rujukan antar tabel.
 *
 * Setiap baris membawa `business_id`, dan setiap rujukan hanya sah bila baris
 * yang dirujuk berada pada warung yang sama. Kunci asing di basis data tidak
 * dapat menjaga itu, karena kunci asing hanya memeriksa keberadaan barisnya.
 * Tanpa pemeriksaan ini, sebuah orderan dapat memakai produk warung lain, dan
 * pembayaran dapat menempel pada orderan warung lain.
 *
 * Seluruh pemeriksaan dijalankan di dalam transaksi pemanggilnya, sehingga
 * tidak ada celah antara pemeriksaan dan penulisan.
 */

/**
 * Bentuk basis data yang cukup untuk pemeriksaan rujukan. Selain pegangan
 * biasa, bentuk ini juga menerima pegangan di dalam transaksi, karena
 * keduanya sama sama turunan `PgDatabase`.
 */
export type Queryable = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Rujukan yang diberikan bukan milik warung ini. */
export class OwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnershipError";
  }
}

/** Memastikan pelanggan yang dirujuk milik warung ini. */
export async function assertCustomerOwned(
  db: Queryable,
  businessId: string,
  customerId: string,
): Promise<void> {
  if (!isUuid(customerId)) {
    throw new OwnershipError("Pelanggan tidak ditemukan pada warung ini");
  }

  const [row] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.id, customerId)))
    .limit(1);

  if (row === undefined) {
    throw new OwnershipError("Pelanggan tidak ditemukan pada warung ini");
  }
}

/** Memastikan percakapan yang dirujuk milik warung ini. */
export async function assertConversationOwned(
  db: Queryable,
  businessId: string,
  conversationId: string,
): Promise<void> {
  if (!isUuid(conversationId)) {
    throw new OwnershipError("Percakapan tidak ditemukan pada warung ini");
  }

  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.businessId, businessId), eq(conversations.id, conversationId)),
    )
    .limit(1);

  if (row === undefined) {
    throw new OwnershipError("Percakapan tidak ditemukan pada warung ini");
  }
}

/** Memastikan orderan yang dirujuk milik warung ini. */
export async function assertOrderOwned(
  db: Queryable,
  businessId: string,
  orderId: string,
): Promise<void> {
  if (!isUuid(orderId)) {
    throw new OwnershipError("Orderan tidak ditemukan pada warung ini");
  }

  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
    .limit(1);

  if (row === undefined) {
    throw new OwnershipError("Orderan tidak ditemukan pada warung ini");
  }
}

/** Memastikan draft pesanan pembelian yang dirujuk milik warung ini. */
export async function assertPurchaseOrderOwned(
  db: Queryable,
  businessId: string,
  purchaseOrderId: string,
): Promise<void> {
  if (!isUuid(purchaseOrderId)) {
    throw new OwnershipError("Draft pesanan pembelian tidak ditemukan pada warung ini");
  }

  const [row] = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.businessId, businessId),
        eq(purchaseOrders.id, purchaseOrderId),
      ),
    )
    .limit(1);

  if (row === undefined) {
    throw new OwnershipError("Draft pesanan pembelian tidak ditemukan pada warung ini");
  }
}

/** Memastikan seluruh produk yang dirujuk milik warung ini. */
export async function assertProductsOwned(
  db: Queryable,
  businessId: string,
  productIds: readonly string[],
): Promise<void> {
  if (productIds.length === 0) {
    return;
  }

  const unique = [...new Set(productIds)];

  if (unique.length === 0) {
    return;
  }

  const valid = unique.filter(isUuid);
  const rows =
    valid.length === 0
      ? []
      : await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.businessId, businessId), inArray(products.id, valid)));

  const found = new Set(rows.map((row) => row.id));
  const missing = unique.filter((productId) => !found.has(productId));

  if (missing.length > 0) {
    throw new OwnershipError(
      `Produk tidak ditemukan pada warung ini: ${missing.join(", ")}`,
    );
  }
}
