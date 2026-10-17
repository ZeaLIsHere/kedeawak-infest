import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  orderItems,
  orders,
  products,
  transactions,
  type Transaction,
} from "../db/schema";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "./period";

/**
 * Rentang waktu setengah terbuka.
 *
 * `from` ikut dihitung dan `to` tidak, sehingga dua hari yang berurutan tidak
 * saling menimpa pada perbatasannya.
 */
export type Period = {
  readonly from: Date;
  readonly to: Date;
};

/** Ringkasan keuangan satu periode. Seluruh jumlah dalam rupiah penuh. */
export type FinancialSummary = {
  readonly sales: number;
  readonly expenses: number;
  readonly debts: number;
  readonly profit: number;
  readonly transactionCount: number;
};

/** Penjualan satu produk pada satu periode. */
export type ProductSales = {
  readonly productId: string;
  readonly name: string;
  readonly unit: string;
  readonly quantity: number;
  readonly revenue: number;
};

/*
 * Jumlah rupiah untuk satu jenis transaksi.
 *
 * Hasil `sum` di PostgreSQL berupa bilangan besar yang dapat kembali sebagai
 * teks, sehingga nilainya dipotong ke bilangan bulat biasa di dalam query.
 */
const amountForKind = (kind: Transaction["kind"]) =>
  sql<number>`cast(coalesce(sum(case when ${transactions.kind} = ${kind} then ${transactions.amount} else 0 end), 0) as integer)`;

/** Ringkasan keuangan pada rentang waktu tertentu. */
export async function summarizePeriod(
  db: Database,
  businessId: string,
  period: Period,
): Promise<FinancialSummary> {
  const [row] = await db
    .select({
      sales: amountForKind("sale"),
      expenses: amountForKind("expense"),
      debts: amountForKind("debt"),
      transactionCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        gte(transactions.occurredAt, period.from),
        lt(transactions.occurredAt, period.to),
      ),
    );

  const sales = row?.sales ?? 0;
  const expenses = row?.expenses ?? 0;

  return {
    sales,
    expenses,
    debts: row?.debts ?? 0,
    profit: sales - expenses,
    transactionCount: row?.transactionCount ?? 0,
  };
}

/** Ringkasan keuangan hari yang memuat waktu tersebut. */
export async function summarizeDay(
  db: Database,
  businessId: string,
  at: Date = new Date(),
): Promise<FinancialSummary> {
  return summarizePeriod(db, businessId, { from: startOfDay(at), to: endOfDay(at) });
}

/** Ringkasan keuangan minggu yang memuat waktu tersebut. */
export async function summarizeWeek(
  db: Database,
  businessId: string,
  at: Date = new Date(),
): Promise<FinancialSummary> {
  return summarizePeriod(db, businessId, { from: startOfWeek(at), to: endOfWeek(at) });
}

/**
 * Produk dengan penjualan terbanyak pada satu periode.
 *
 * Penjualan per produk dihitung dari rincian orderan yang tercatat, sehingga
 * pertanyaannya adalah barang apa yang paling banyak dibeli pelanggan.
 */
export async function listTopProducts(
  db: Database,
  businessId: string,
  period: Period,
  limit = 5,
): Promise<ProductSales[]> {
  return db
    .select({
      productId: orderItems.productId,
      name: products.name,
      unit: products.unit,
      quantity: sql<number>`cast(sum(${orderItems.quantity}) as integer)`,
      revenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as integer)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orderItems.businessId, businessId),
        gte(orders.createdAt, period.from),
        lt(orders.createdAt, period.to),
      ),
    )
    .groupBy(orderItems.productId, products.name, products.unit)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
}

export type PaymentSummary = {
  readonly tunai: number;
  readonly transfer: number;
  readonly qris: number;
  readonly belumDiketahui: number;
};
/** Metode pembayaran penjualan pada rentang setengah terbuka yang sama. */
export async function summarizePayments(
  db: Database,
  businessId: string,
  period: Period,
): Promise<PaymentSummary> {
  const rows = await db
    .select({
      method: transactions.method,
      amount: sql<number>`cast(coalesce(sum(${transactions.amount}),0) as integer)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        eq(transactions.kind, "sale"),
        gte(transactions.occurredAt, period.from),
        lt(transactions.occurredAt, period.to),
      ),
    )
    .groupBy(transactions.method);
  const result = { tunai: 0, transfer: 0, qris: 0, belumDiketahui: 0 };
  for (const row of rows) result[row.method ?? "belumDiketahui"] += row.amount;
  return result;
}
