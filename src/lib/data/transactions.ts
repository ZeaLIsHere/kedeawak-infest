import { and, desc, eq, gte, lt } from "drizzle-orm";

import type { Database } from "../db/client";
import { transactions, type Transaction } from "../db/schema";
import { isUuid } from "./ids";
import { assertCustomerOwned } from "./ownership";

/** Data satu transaksi keuangan. Jumlahnya bilangan bulat rupiah penuh. */
export type TransactionInput = {
  readonly kind: Transaction["kind"];
  readonly description: string;
  readonly amount: number;
  readonly source: Transaction["source"];
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
