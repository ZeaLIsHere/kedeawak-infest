import { and, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { quotaUsage } from "../db/schema";
import { startOfDay } from "./period";

/*
 * Pencatat pemakaian harian.
 *
 * Satu baris mewakili satu warung pada satu hari, dan harinya dihitung menurut
 * Waktu Indonesia Barat melalui `startOfDay`. Batas pemakaiannya sendiri
 * ditetapkan lapisan kebijakan, bukan di sini, supaya angkanya dapat diubah
 * tanpa menyentuh akses data.
 */

/** Membaca pemakaian harian sebuah warung. Hari yang belum tercatat bernilai nol. */
export async function readQuotaUsage(
  db: Database,
  businessId: string,
  at: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .select({ count: quotaUsage.count })
    .from(quotaUsage)
    .where(
      and(
        eq(quotaUsage.businessId, businessId),
        eq(quotaUsage.usageDate, startOfDay(at)),
      ),
    )
    .limit(1);

  return row?.count ?? 0;
}

/** Menambah pemakaian harian sebanyak satu, lalu mengembalikan jumlah terbaru. */
export async function increaseQuotaUsage(
  db: Database,
  businessId: string,
  at: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .insert(quotaUsage)
    .values({ businessId, usageDate: startOfDay(at), count: 1 })
    .onConflictDoUpdate({
      target: [quotaUsage.businessId, quotaUsage.usageDate],
      set: { count: sql`${quotaUsage.count} + 1`, updatedAt: new Date() },
    })
    .returning();

  if (row === undefined) {
    throw new Error("Pemakaian harian gagal dicatat");
  }

  return row.count;
}

/**
 * Mengembalikan pemakaian harian ke nol.
 *
 * Dipakai saat menyiapkan data demo, supaya penghitungnya tidak diwarisi dari
 * percobaan sebelumnya.
 */
export async function resetQuotaUsage(
  db: Database,
  businessId: string,
  at: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .insert(quotaUsage)
    .values({ businessId, usageDate: startOfDay(at), count: 0 })
    .onConflictDoUpdate({
      target: [quotaUsage.businessId, quotaUsage.usageDate],
      set: { count: 0, updatedAt: new Date() },
    })
    .returning();

  return row?.count ?? 0;
}
