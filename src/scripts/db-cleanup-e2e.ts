import { sql } from "drizzle-orm";

import { createDatabase } from "../lib/db/client";
import { loadScriptEnv } from "./load-env";

/*
 * Menghapus produk yang dibuat oleh uji peramban kelola produk.
 *
 * Uji tersebut membuat produk bernama `Biskuit uji ...` pada basis data yang
 * dipakai server demo. Produk itu bukan produk warung, sehingga dibersihkan
 * setelah pengujian. Produk yang sudah dipakai orderan atau pesanan pembelian
 * sengaja dilewati agar riwayat transaksi tidak rusak.
 */

const TEST_NAME_PATTERN = "Biskuit uji %";

async function main(): Promise<void> {
  loadScriptEnv();

  const handle = createDatabase();

  try {
    await handle.db.execute(sql`
      delete from stock_alerts
      where product_id in (
        select id from products where name ilike ${TEST_NAME_PATTERN}
      )
    `);
    await handle.db.execute(sql`
      delete from stock_movements
      where product_id in (
        select id from products where name ilike ${TEST_NAME_PATTERN}
      )
    `);
    const deleted = await handle.db.execute<{ name: string }>(sql`
      delete from products
      where name ilike ${TEST_NAME_PATTERN}
        and not exists (
          select 1 from order_items where order_items.product_id = products.id
        )
        and not exists (
          select 1 from purchase_order_items
          where purchase_order_items.product_id = products.id
        )
      returning name
    `);

    for (const row of deleted.rows) {
      console.log(`Produk uji dihapus: ${row.name}`);
    }
    console.log(`Total produk uji dihapus: ${deleted.rows.length}.`);
  } finally {
    await handle.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Pembersihan produk uji gagal.");
  console.error(error);
  process.exitCode = 1;
});
