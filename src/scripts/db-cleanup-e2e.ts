import { sql } from "drizzle-orm";

import { createDatabase } from "../lib/db/client";
import { loadScriptEnv } from "./load-env";

/*
 * Menghapus produk yang dibuat oleh uji peramban.
 *
 * Uji kelola produk membuat `Biskuit uji ...`, sedangkan uji persetujuan
 * membuat `Persediaan uji ...`. Keduanya bukan produk warung, sehingga
 * dibersihkan setelah pengujian. Rincian pesanan pembelian dan persetujuannya
 * ikut dihapus lebih dulu karena produknya masih dirujuk. Produk yang sudah
 * dipakai orderan sengaja dilewati agar riwayat transaksi tidak rusak.
 */

const TEST_NAME_PATTERNS = ["Biskuit uji %", "Persediaan uji %"] as const;

async function main(): Promise<void> {
  loadScriptEnv();

  const handle = createDatabase();

  try {
    let total = 0;

    for (const pattern of TEST_NAME_PATTERNS) {
      await handle.db.execute(sql`
        delete from approvals
        where payload->>'purchaseOrderId' in (
          select poi.purchase_order_id::text
          from purchase_order_items poi
          join products p on p.id = poi.product_id
          where p.name ilike ${pattern}
        )
      `);
      await handle.db.execute(sql`
        delete from purchase_orders
        where id in (
          select poi.purchase_order_id
          from purchase_order_items poi
          join products p on p.id = poi.product_id
          where p.name ilike ${pattern}
        )
      `);
      await handle.db.execute(sql`
        delete from stock_alerts
        where product_id in (
          select id from products where name ilike ${pattern}
        )
      `);
      await handle.db.execute(sql`
        delete from stock_movements
        where product_id in (
          select id from products where name ilike ${pattern}
        )
      `);
      const deleted = await handle.db.execute<{ name: string }>(sql`
        delete from products
        where name ilike ${pattern}
          and not exists (
            select 1 from order_items where order_items.product_id = products.id
          )
        returning name
      `);

      for (const row of deleted.rows) {
        console.log(`Produk uji dihapus: ${row.name}`);
      }
      total += deleted.rows.length;
    }

    console.log(`Total produk uji dihapus: ${total}.`);
  } finally {
    await handle.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Pembersihan produk uji gagal.");
  console.error(error);
  process.exitCode = 1;
});
