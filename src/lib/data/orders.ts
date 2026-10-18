import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  orderItems,
  orders,
  transactions,
  type Order,
  type OrderItem,
} from "../db/schema";
import { isUuid } from "./ids";
import {
  assertConversationOwned,
  assertCustomerOwned,
  assertProductsOwned,
} from "./ownership";
import { applyStockMovement } from "./stock";

/** Satu barang di dalam orderan. Harga satuan disimpan apa adanya saat orderan dibuat. */
export type OrderItemInput = {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
};

/** Data pembuatan satu orderan. */
export type OrderInput = {
  readonly conversationId?: string | null;
  readonly customerId?: string | null;
  readonly items: readonly OrderItemInput[];
  /** Waktu pembuatan orderan. Dipakai saat menyiapkan data demo yang beriwayat. */
  readonly createdAt?: Date;
};

/** Orderan beserta rincian itemnya. */
export type OrderWithItems = {
  readonly order: Order;
  readonly items: readonly OrderItem[];
};

/**
 * Penyaring daftar orderan.
 *
 * `from` dan `to` menyaring `createdAt` secara setengah terbuka, sama seperti
 * `reports.ts`: `from` ikut dihitung dan `to` tidak.
 */
export type OrderFilter = {
  readonly status?: Order["status"];
  readonly from?: Date;
  readonly to?: Date;
  readonly limit?: number;
};

/** Menghitung total orderan dari rincian itemnya. */
export function orderTotal(items: readonly OrderItemInput[]): number {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

/**
 * Membuat orderan beserta rincian itemnya dalam satu transaksi basis data.
 *
 * Seluruh rujukan diperiksa lebih dulu: produk, percakapan, dan pelanggan wajib
 * milik warung yang sama. Bila salah satu gagal, tidak ada yang tersimpan,
 * karena seluruhnya berada dalam satu transaksi.
 */
export async function createOrder(
  db: Database,
  businessId: string,
  input: OrderInput,
): Promise<OrderWithItems> {
  return db.transaction(async (tx) => {
    await assertProductsOwned(
      tx,
      businessId,
      input.items.map((item) => item.productId),
    );

    if (input.conversationId !== undefined && input.conversationId !== null) {
      await assertConversationOwned(tx, businessId, input.conversationId);
    }

    if (input.customerId !== undefined && input.customerId !== null) {
      await assertCustomerOwned(tx, businessId, input.customerId);
    }

    const [order] = await tx
      .insert(orders)
      .values({
        businessId,
        conversationId: input.conversationId ?? null,
        customerId: input.customerId ?? null,
        total: orderTotal(input.items),
        ...(input.createdAt === undefined ? {} : { createdAt: input.createdAt }),
      })
      .returning();

    if (order === undefined) {
      throw new Error("Orderan gagal dibuat");
    }

    const items =
      input.items.length === 0
        ? []
        : await tx
            .insert(orderItems)
            .values(
              input.items.map((item) => ({
                businessId,
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            )
            .returning();

    return { order, items };
  });
}

/** Daftar orderan warung, yang paling baru lebih dulu. */
export async function listOrders(
  db: Database,
  businessId: string,
  filter: OrderFilter = {},
): Promise<Order[]> {
  const conditions = [eq(orders.businessId, businessId)];

  if (filter.status !== undefined) {
    conditions.push(eq(orders.status, filter.status));
  }

  if (filter.from !== undefined) {
    conditions.push(gte(orders.createdAt, filter.from));
  }

  if (filter.to !== undefined) {
    conditions.push(lt(orders.createdAt, filter.to));
  }

  const query = db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  return filter.limit === undefined ? query : query.limit(filter.limit);
}

/** Mengambil satu orderan menurut kuncinya. */
export async function findOrder(
  db: Database,
  businessId: string,
  orderId: string,
): Promise<Order | undefined> {
  if (!isUuid(orderId)) {
    return undefined;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
    .limit(1);

  return order;
}

/** Mengambil satu orderan beserta rincian itemnya. */
export async function findOrderWithItems(
  db: Database,
  businessId: string,
  orderId: string,
): Promise<OrderWithItems | undefined> {
  const order = await findOrder(db, businessId, orderId);

  if (order === undefined) {
    return undefined;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.businessId, businessId), eq(orderItems.orderId, orderId)));

  return { order, items };
}

/** Mengambil rincian item beberapa orderan sekaligus. */
export async function listItemsForOrders(
  db: Database,
  businessId: string,
  orderIds: readonly string[],
): Promise<OrderItem[]> {
  if (orderIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.businessId, businessId),
        inArray(orderItems.orderId, [...orderIds]),
      ),
    );
}

/** Mengubah keadaan orderan. */
export async function updateOrderStatus(
  db: Database,
  businessId: string,
  orderId: string,
  status: Order["status"],
): Promise<Order | undefined> {
  const [order] = await db
    .update(orders)
    .set({ status })
    .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
    .returning();

  return order;
}

/** Jenis pembayaran yang dapat dipilih saat pesanan dikonfirmasi. */
export type OrderPaymentMethod = "tunai" | "transfer" | "qris";

/**
 * Membatalkan pesanan WhatsApp yang belum dikonfirmasi.
 *
 * Hanya status `baru` yang dapat dibatalkan. Pesanan yang sudah dikonfirmasi
 * sudah menulis penjualan dan mengurangi stok, sehingga tidak diubah di sini.
 * Pesanan tetap tersimpan dengan status `dibatalkan` agar riwayatnya utuh.
 */
export async function cancelOrder(
  db: Database,
  businessId: string,
  orderId: string,
): Promise<Order | undefined> {
  if (!isUuid(orderId)) return undefined;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
      .for("update");

    if (order === undefined || order.status !== "baru") return undefined;

    const [updated] = await tx
      .update(orders)
      .set({ status: "dibatalkan" })
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.id, order.id),
          eq(orders.status, "baru"),
        ),
      )
      .returning();

    return updated;
  });
}

/**
 * Mengonfirmasi pesanan WhatsApp menjadi penjualan.
 *
 * Hanya pesanan berstatus `baru` yang dapat dikonfirmasi. Penjualan, perubahan
 * stok, dan status pesanan ditulis dalam satu transaksi. Pesanan yang sudah
 * selesai atau sudah memiliki transaksi penjualan tidak diproses ulang.
 */
export async function confirmOrder(
  db: Database,
  businessId: string,
  orderId: string,
  method: OrderPaymentMethod,
): Promise<{ order: Order; total: number } | undefined> {
  if (!isUuid(orderId)) return undefined;
  if (!["tunai", "transfer", "qris"].includes(method)) {
    throw new Error("Jenis pembayaran tidak valid");
  }

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
      .for("update");

    if (order === undefined || order.status !== "baru") return undefined;

    const items = await tx
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.businessId, businessId), eq(orderItems.orderId, order.id)),
      );

    if (items.length === 0) throw new Error("Pesanan tidak memiliki item");

    const [existing] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          eq(transactions.orderId, order.id),
          eq(transactions.kind, "sale"),
        ),
      )
      .limit(1);

    if (existing !== undefined) return undefined;

    for (const item of items) {
      await applyStockMovement(tx, businessId, {
        productId: item.productId,
        kind: "keluar",
        quantityChange: -item.quantity,
        reason: "Penjualan dari konfirmasi pesanan WhatsApp",
      });
    }

    await tx.insert(transactions).values({
      businessId,
      orderId: order.id,
      customerId: order.customerId,
      kind: "sale",
      amount: order.total,
      source: "whatsapp",
      method,
      description: "Penjualan dari pesanan WhatsApp",
    });

    const [updated] = await tx
      .update(orders)
      .set({ status: "selesai" })
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.id, order.id),
          eq(orders.status, "baru"),
        ),
      )
      .returning();

    if (updated === undefined) throw new Error("Pesanan sudah diproses");

    return { order: updated, total: order.total };
  });
}
