import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { payments, type Payment } from "../db/schema";
import { isUuid } from "./ids";
import { assertOrderOwned } from "./ownership";

/** Bukti pembayaran yang baru masuk. */
export type PaymentInput = {
  readonly orderId: string;
  readonly expectedAmount: number;
  readonly proofUrl?: string | null;
};

/** Hasil pencocokan bukti pembayaran dengan nilai yang diharapkan. */
export type PaymentReadingInput = {
  readonly readAmount: number;
  readonly status: Payment["status"];
};

/** Menulis bukti pembayaran. Keadaannya menunggu sampai dicocokkan. */
export async function createPayment(
  db: Database,
  businessId: string,
  input: PaymentInput,
): Promise<Payment> {
  return db.transaction(async (tx) => {
    await assertOrderOwned(tx, businessId, input.orderId);

    const [payment] = await tx
      .insert(payments)
      .values({
        businessId,
        orderId: input.orderId,
        expectedAmount: input.expectedAmount,
        proofUrl: input.proofUrl ?? null,
      })
      .returning();

    if (payment === undefined) {
      throw new Error("Bukti pembayaran gagal ditulis");
    }

    return payment;
  });
}

/** Menyimpan hasil pencocokan bukti pembayaran. */
export async function recordPaymentReading(
  db: Database,
  businessId: string,
  paymentId: string,
  input: PaymentReadingInput,
): Promise<Payment | undefined> {
  const [payment] = await db
    .update(payments)
    .set({ readAmount: input.readAmount, status: input.status })
    .where(and(eq(payments.businessId, businessId), eq(payments.id, paymentId)))
    .returning();

  return payment;
}

/** Mengambil satu bukti pembayaran. */
export async function findPayment(
  db: Database,
  businessId: string,
  paymentId: string,
): Promise<Payment | undefined> {
  if (!isUuid(paymentId)) {
    return undefined;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.businessId, businessId), eq(payments.id, paymentId)))
    .limit(1);

  return payment;
}

/** Bukti pembayaran sebuah orderan, yang paling baru lebih dulu. */
export async function listPaymentsForOrder(
  db: Database,
  businessId: string,
  orderId: string,
): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.businessId, businessId), eq(payments.orderId, orderId)))
    .orderBy(desc(payments.createdAt));
}

/** Bukti pembayaran menurut keadaannya, misalnya yang masih menunggu. */
export async function listPaymentsByStatus(
  db: Database,
  businessId: string,
  status: Payment["status"],
): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.businessId, businessId), eq(payments.status, status)))
    .orderBy(desc(payments.createdAt));
}
