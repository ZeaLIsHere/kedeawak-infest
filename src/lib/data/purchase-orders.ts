import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  purchaseOrderItems,
  purchaseOrders,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from "../db/schema";
import { isUuid } from "./ids";
import { assertProductsOwned, type Queryable } from "./ownership";

/** Satu barang pada draft pesanan pembelian. */
export type PurchaseOrderItemInput = {
  readonly productId: string;
  readonly quantity: number;
  readonly estimatedPrice: number;
};

/** Data pembuatan satu draft pesanan pembelian. */
export type PurchaseOrderInput = {
  readonly supplierName: string;
  readonly items: readonly PurchaseOrderItemInput[];
};

/** Draft pesanan pembelian beserta rincian itemnya. */
export type PurchaseOrderWithItems = {
  readonly order: PurchaseOrder;
  readonly items: readonly PurchaseOrderItem[];
};

/** Keputusan yang dapat diambil pemilik atas sebuah draft. */
export type PurchaseOrderDecision = Extract<
  PurchaseOrder["status"],
  "disetujui" | "ditolak"
>;

/** Penyaring daftar draft pesanan pembelian. */
export type PurchaseOrderFilter = {
  readonly status?: PurchaseOrder["status"];
  readonly limit?: number;
};

/** Menghitung perkiraan nilai sebuah draft dari rincian itemnya. */
export function purchaseOrderTotal(items: readonly PurchaseOrderItemInput[]): number {
  return items.reduce((total, item) => total + item.quantity * item.estimatedPrice, 0);
}

/**
 * Membuat draft pesanan pembelian beserta rincian itemnya.
 *
 * Draft tidak mengubah stok dan tidak mengubah keuangan. Perubahannya baru
 * terjadi setelah pemilik menyetujuinya, sesuai `docs/SCOPE.md`.
 */
export async function createPurchaseOrder(
  db: Database,
  businessId: string,
  input: PurchaseOrderInput,
): Promise<PurchaseOrderWithItems> {
  return db.transaction(async (tx) => {
    await assertProductsOwned(
      tx,
      businessId,
      input.items.map((item) => item.productId),
    );

    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        businessId,
        supplierName: input.supplierName,
        total: purchaseOrderTotal(input.items),
      })
      .returning();

    if (order === undefined) {
      throw new Error("Draft pesanan pembelian gagal dibuat");
    }

    const items =
      input.items.length === 0
        ? []
        : await tx
            .insert(purchaseOrderItems)
            .values(
              input.items.map((item) => ({
                businessId,
                purchaseOrderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                estimatedPrice: item.estimatedPrice,
              })),
            )
            .returning();

    return { order, items };
  });
}

/** Mengambil satu draft pesanan pembelian. */
export async function findPurchaseOrder(
  db: Database,
  businessId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder | undefined> {
  if (!isUuid(purchaseOrderId)) {
    return undefined;
  }

  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.businessId, businessId),
        eq(purchaseOrders.id, purchaseOrderId),
      ),
    )
    .limit(1);

  return order;
}

/** Mengambil satu draft pesanan pembelian beserta rincian itemnya. */
export async function findPurchaseOrderWithItems(
  db: Database,
  businessId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrderWithItems | undefined> {
  const order = await findPurchaseOrder(db, businessId, purchaseOrderId);

  if (order === undefined) {
    return undefined;
  }

  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(
      and(
        eq(purchaseOrderItems.businessId, businessId),
        eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId),
      ),
    );

  return { order, items };
}

/** Daftar draft pesanan pembelian, yang paling baru lebih dulu. */
export async function listPurchaseOrders(
  db: Database,
  businessId: string,
  filter: PurchaseOrderFilter = {},
): Promise<PurchaseOrder[]> {
  const conditions = [eq(purchaseOrders.businessId, businessId)];

  if (filter.status !== undefined) {
    conditions.push(eq(purchaseOrders.status, filter.status));
  }

  const query = db
    .select()
    .from(purchaseOrders)
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.createdAt));

  return filter.limit === undefined ? query : query.limit(filter.limit);
}

/**
 * Memutuskan sebuah draft pesanan pembelian.
 *
 * Hanya draft yang dapat diputuskan, sehingga keputusan tidak dapat ditimpa
 * atau dibalik. Draft yang sudah diputuskan menjawab kosong, sama seperti draft
 * yang tidak ada pada warung ini.
 */
export async function decidePurchaseOrder(
  db: Queryable,
  businessId: string,
  purchaseOrderId: string,
  decision: PurchaseOrderDecision,
): Promise<PurchaseOrder | undefined> {
  if (!isUuid(purchaseOrderId)) {
    return undefined;
  }

  const [order] = await db
    .update(purchaseOrders)
    .set({ status: decision, decidedAt: new Date() })
    .where(
      and(
        eq(purchaseOrders.businessId, businessId),
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.status, "draft"),
      ),
    )
    .returning();

  return order;
}
