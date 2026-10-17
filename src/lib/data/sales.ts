import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { businesses, orderItems, orders, products, transactions } from "../db/schema";
import { isUuid } from "./ids";
import { assertConversationOwned, assertCustomerOwned } from "./ownership";
import { applyStockMovement } from "./stock";
export type SaleInput = {
  readonly items: readonly { readonly productId: string; readonly quantity: number }[];
  readonly method: "tunai" | "transfer" | "qris";
  readonly cashReceived?: number;
  readonly requestId?: string;
  readonly source?: "app" | "whatsapp";
  readonly customerId?: string;
  readonly conversationId?: string;
};
export class SaleError extends Error {}
/** Harga dan stok diperiksa kembali dalam transaksi yang mengunci produk. */
export async function createSale(
  db: Database,
  businessId: string,
  input: SaleInput,
): Promise<{ orderId: string; total: number }> {
  if (
    !input ||
    !Array.isArray(input.items) ||
    input.items.length === 0 ||
    input.items.length > 100
  )
    throw new SaleError("Keranjang harus berisi produk");
  if (!["tunai", "transfer", "qris"].includes(input.method))
    throw new SaleError("Pilih jenis pembayaran yang tersedia");
  if (input.requestId !== undefined && !isUuid(input.requestId))
    throw new SaleError("Kunci penjualan tidak valid");
  if (input.source !== undefined && !["app", "whatsapp"].includes(input.source))
    throw new SaleError("Asal penjualan tidak valid");
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (
      !item ||
      !isUuid(item.productId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    )
      throw new SaleError("Jumlah produk harus bilangan bulat lebih dari nol");
    const combined = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(combined) || combined > 2147483647)
      throw new SaleError("Jumlah produk terlalu besar");
    quantities.set(item.productId, combined);
  }
  return db.transaction(async (tx) => {
    if (input.requestId !== undefined) {
      await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .for("update");
      const [prior] = await tx
        .select()
        .from(orders)
        .where(
          and(eq(orders.businessId, businessId), eq(orders.requestId, input.requestId)),
        );
      if (prior) {
        const priorItems = await tx
          .select()
          .from(orderItems)
          .where(
            and(eq(orderItems.businessId, businessId), eq(orderItems.orderId, prior.id)),
          );
        const [payment] = await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.businessId, businessId),
              eq(transactions.orderId, prior.id),
              eq(transactions.kind, "sale"),
            ),
          );
        if (
          priorItems.length !== quantities.size ||
          priorItems.some((item) => quantities.get(item.productId) !== item.quantity) ||
          payment?.method !== input.method ||
          payment?.source !== (input.source ?? "app") ||
          (prior.customerId ?? undefined) !== input.customerId ||
          (prior.conversationId ?? undefined) !== input.conversationId
        )
          throw new SaleError("Kunci penjualan sudah dipakai untuk belanja yang berbeda");
        return { orderId: prior.id, total: prior.total };
      }
    }
    if (input.customerId !== undefined)
      await assertCustomerOwned(tx, businessId, input.customerId);
    if (input.conversationId !== undefined)
      await assertConversationOwned(tx, businessId, input.conversationId);
    const selected = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          isNull(products.archivedAt),
          inArray(products.id, [...quantities.keys()]),
        ),
      )
      .orderBy(products.id)
      .for("update");
    if (selected.length !== quantities.size)
      throw new SaleError("Produk tidak tersedia atau sudah diarsipkan");
    let total = 0;
    for (const product of selected) {
      const quantity = quantities.get(product.id)!;
      if (product.stock < quantity)
        throw new SaleError(`Stok ${product.name} tidak mencukupi`);
      total += quantity * product.salePrice;
    }
    if (!Number.isSafeInteger(total) || total < 0 || total > 2147483647)
      throw new SaleError("Total penjualan terlalu besar");
    if (
      input.method === "tunai" &&
      (!Number.isSafeInteger(input.cashReceived) || input.cashReceived! < total)
    )
      throw new SaleError("Uang diterima belum mencukupi total belanja");
    const [order] = await tx
      .insert(orders)
      .values({
        businessId,
        requestId: input.requestId,
        total,
        status: "selesai",
        customerId: input.customerId,
        conversationId: input.conversationId,
      })
      .returning();
    if (!order) throw new SaleError("Penjualan gagal dicatat");
    await tx
      .insert(orderItems)
      .values(
        selected.map((p) => ({
          businessId,
          orderId: order.id,
          productId: p.id,
          quantity: quantities.get(p.id)!,
          unitPrice: p.salePrice,
        })),
      );
    await tx
      .insert(transactions)
      .values({
        businessId,
        orderId: order.id,
        customerId: input.customerId,
        kind: "sale",
        amount: total,
        source: input.source ?? "app",
        method: input.method,
        description: `Penjualan ${selected.map((p) => p.name).join(", ")}`,
      });
    for (const product of selected)
      await applyStockMovement(tx, businessId, {
        productId: product.id,
        kind: "keluar",
        quantityChange: -quantities.get(product.id)!,
        reason: "Penjualan melalui kasir",
      });
    return { orderId: order.id, total };
  });
}
