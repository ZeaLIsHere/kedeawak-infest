import { sql } from "drizzle-orm";

import { createDatabase } from "../lib/db/client";
import { loadScriptEnv } from "./load-env";

/*
 * Membersihkan data demo lama yang sengaja menurunkan stok.
 *
 * Versi seed sebelumnya menjual `Sarden Kaleng` dan `Biskuit Kaleng` sampai di
 * bawah ambang minimum, lalu membuat draft pesanan pembelian dari alert itu.
 * Seed sekarang tidak lagi melakukannya. Skrip ini membantu basis data yang
 * sudah terlanjur memakai seed lama, tanpa menyentuh produk lain.
 *
 * Jalankan saat server dev berhenti karena PGlite hanya mengizinkan satu
 * proses menulis.
 */

const DEMO_PRODUCTS = ["Sarden Kaleng", "Biskuit Kaleng"] as const;

async function main(): Promise<void> {
  loadScriptEnv();

  const handle = createDatabase();

  try {
    await handle.db.transaction(async (tx) => {
      await tx.execute(sql`
        delete from approvals
        where summary like 'Tambah stok Sarden Kaleng%'
          or payload->>'purchaseOrderId' in (
            select poi.purchase_order_id::text
            from purchase_order_items poi
            join products p on p.id = poi.product_id
            where p.name = 'Sarden Kaleng'
          )
      `);
      await tx.execute(sql`
        delete from purchase_orders
        where id in (
          select poi.purchase_order_id
          from purchase_order_items poi
          join products p on p.id = poi.product_id
          where p.name = 'Sarden Kaleng'
        )
      `);
      await tx.execute(sql`
        delete from stock_alerts
        where product_id in (
          select id from products
          where name in ('Sarden Kaleng', 'Biskuit Kaleng')
        )
      `);
      await tx.execute(sql`
        delete from stock_movements
        where reason in ('Penjualan Sarden Kaleng', 'Penjualan Biskuit Kaleng')
          and product_id in (
            select id from products
            where name in ('Sarden Kaleng', 'Biskuit Kaleng')
          )
      `);
      await tx.execute(sql`
        delete from transactions
        where source = 'app'
          and description in ('Penjualan Sarden Kaleng', 'Penjualan Biskuit Kaleng')
      `);
      await tx.execute(sql`
        update products p
        set stock = coalesce((
          select sum(sm.quantity_change)
          from stock_movements sm
          where sm.product_id = p.id
        ), 0)
        where p.name in ('Sarden Kaleng', 'Biskuit Kaleng')
      `);
    });

    const rows = await handle.db.execute<{ name: string; stock: number }>(sql`
      select name, stock from products
      where name in ('Sarden Kaleng', 'Biskuit Kaleng')
      order by name
    `);

    for (const row of rows.rows) {
      console.log(`Stok dikembalikan: ${row.name} menjadi ${row.stock}.`);
    }
    console.log(`Produk dibersihkan: ${DEMO_PRODUCTS.length}.`);
  } finally {
    await handle.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Pembersihan data demo gagal.");
  console.error(error);
  process.exitCode = 1;
});
