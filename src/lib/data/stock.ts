import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  stockAlerts,
  stockMovements,
  type StockAlert,
  type StockMovement,
} from "../db/schema";

/*
 * Berkas ini memuat bagian baca dari stok. Perubahan stok, yaitu penulisan
 * pergerakan, perhitungan stok terkini, dan alert, ditambahkan pada T2.6.
 */

/** Jejak pergerakan stok, terbaru lebih dulu. Dapat disaring menurut produk. */
export async function listStockMovements(
  db: Database,
  businessId: string,
  productId?: string,
): Promise<StockMovement[]> {
  const conditions = [eq(stockMovements.businessId, businessId)];

  if (productId !== undefined) {
    conditions.push(eq(stockMovements.productId, productId));
  }

  return db
    .select()
    .from(stockMovements)
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt));
}

/** Alert stok menipis. Dapat disaring menurut keadaannya. */
export async function listStockAlerts(
  db: Database,
  businessId: string,
  status?: StockAlert["status"],
): Promise<StockAlert[]> {
  const conditions = [eq(stockAlerts.businessId, businessId)];

  if (status !== undefined) {
    conditions.push(eq(stockAlerts.status, status));
  }

  return db
    .select()
    .from(stockAlerts)
    .where(and(...conditions))
    .orderBy(desc(stockAlerts.createdAt));
}
