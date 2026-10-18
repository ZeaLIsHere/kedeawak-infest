import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import type { Database } from "../db/client";
import { orderItems, products, transactions, type Transaction } from "../db/schema";
import { isUuid } from "./ids";
import { assertCustomerOwned } from "./ownership";

/** Data satu transaksi keuangan. Jumlahnya bilangan bulat rupiah penuh. */
export type TransactionInput = {
  readonly kind: Transaction["kind"];
  readonly description: string;
  readonly amount: number;
  readonly source: Transaction["source"];
  readonly method?: Transaction["method"];
  readonly customerId?: string | null;
  readonly proofUrl?: string | null;
  readonly confidence?: number | null;
  readonly occurredAt?: Date;
};

/** Penyaring daftar transaksi. Semua bagiannya opsional. */
export type TransactionFilter = {
  readonly from?: Date;
  readonly to?: Date;
  readonly kind?: Transaction["kind"];
};

/** Menulis satu transaksi keuangan. */
export async function createTransaction(
  db: Database,
  businessId: string,
  input: TransactionInput,
): Promise<Transaction> {
  return db.transaction(async (tx) => {
    if (input.customerId !== undefined && input.customerId !== null) {
      await assertCustomerOwned(tx, businessId, input.customerId);
    }

    const [transaction] = await tx
      .insert(transactions)
      .values({
        businessId,
        kind: input.kind,
        description: input.description,
        amount: input.amount,
        source: input.source,
        method: input.method ?? null,
        customerId: input.customerId ?? null,
        proofUrl: input.proofUrl ?? null,
        confidence: input.confidence ?? null,
        ...(input.occurredAt === undefined ? {} : { occurredAt: input.occurredAt }),
      })
      .returning();

    if (transaction === undefined) {
      throw new Error("Transaksi gagal ditulis");
    }

    return transaction;
  });
}

/**
 * Daftar transaksi pada satu rentang waktu, terbaru lebih dulu.
 *
 * Rentangnya setengah terbuka seperti di `period.ts` dan `reports.ts`: `from`
 * ikut dihitung dan `to` tidak. Kesamaannya penting supaya daftar transaksi dan
 * ringkasan periode pada rentang yang sama tidak menghitung satu transaksi dua
 * kali, tepat pada perbatasan hari atau minggu.
 */
export async function listTransactions(
  db: Database,
  businessId: string,
  filter: TransactionFilter = {},
): Promise<Transaction[]> {
  const conditions = [eq(transactions.businessId, businessId)];

  if (filter.from !== undefined) {
    conditions.push(gte(transactions.occurredAt, filter.from));
  }

  if (filter.to !== undefined) {
    conditions.push(lt(transactions.occurredAt, filter.to));
  }

  if (filter.kind !== undefined) {
    conditions.push(eq(transactions.kind, filter.kind));
  }

  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt));
}

/** Satu item yang tersimpan pada orderan asal transaksi penjualan. */
export type TransactionItemDetail = {
  readonly productId: string;
  readonly name: string;
  readonly unit: string;
  readonly quantity: number;
  readonly unitPrice: number;
};

/** Transaksi beserta item yang dapat ditampilkan pada rincian. */
export type TransactionWithItems = Transaction & {
  readonly items: readonly TransactionItemDetail[];
};

/**
 * Daftar transaksi beserta rincian itemnya.
 *
 * Hanya penjualan yang berasal dari orderan yang memiliki item. Pengeluaran,
 * hutang, dan transaksi lama tanpa orderan tetap dikembalikan dengan daftar
 * item kosong supaya semua transaksi dapat dibuka tanpa mengarang isi.
 */
export async function listTransactionsWithItems(
  db: Database,
  businessId: string,
  filter: TransactionFilter = {},
): Promise<TransactionWithItems[]> {
  const rows = await listTransactions(db, businessId, filter);
  const orderIds = [
    ...new Set(
      rows.flatMap((transaction) =>
        transaction.orderId === null ? [] : [transaction.orderId],
      ),
    ),
  ];

  const itemsByOrder = new Map<string, TransactionItemDetail[]>();

  if (orderIds.length > 0) {
    const itemRows = await db
      .select({
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        name: products.name,
        unit: products.unit,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
      })
      .from(orderItems)
      .innerJoin(
        products,
        and(eq(products.id, orderItems.productId), eq(products.businessId, businessId)),
      )
      .where(
        and(eq(orderItems.businessId, businessId), inArray(orderItems.orderId, orderIds)),
      )
      .orderBy(products.name);

    for (const item of itemRows) {
      const items = itemsByOrder.get(item.orderId) ?? [];
      items.push({
        productId: item.productId,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      itemsByOrder.set(item.orderId, items);
    }
  }

  return rows.map((transaction) => ({
    ...transaction,
    items:
      transaction.orderId === null ? [] : (itemsByOrder.get(transaction.orderId) ?? []),
  }));
}

/** Mengambil satu transaksi. */
export async function findTransaction(
  db: Database,
  businessId: string,
  transactionId: string,
): Promise<Transaction | undefined> {
  if (!isUuid(transactionId)) {
    return undefined;
  }

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.businessId, businessId), eq(transactions.id, transactionId)),
    )
    .limit(1);

  return transaction;
}
