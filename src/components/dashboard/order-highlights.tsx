import { ShoppingBag } from "lucide-react";
import { connection } from "next/server";

import { MetricBlock } from "@/components/shell/metric-block";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { listOrders } from "@/lib/data/orders";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "@/lib/data/period";
import { listTopProducts } from "@/lib/data/reports";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

/** Kerangka muat untuk T5.2: jumlah orderan dan produk terlaris. */
export function OrderHighlightsSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/**
 * Jumlah orderan hari ini dan produk terlaris minggu ini (T5.2).
 *
 * Jumlah orderan dibaca untuk hari berjalan karena itu yang ditanyakan pemilik
 * warung pagi ini. Produk terlaris dibaca untuk minggu berjalan karena satu
 * hari sering belum cukup untuk memperlihatkan pola.
 */
export async function OrderHighlights() {
  await connection();

  const now = new Date();
  const day = { from: startOfDay(now), to: endOfDay(now) };
  const week = { from: startOfWeek(now), to: endOfWeek(now) };

  const data = await withCurrentBusiness(async (db, businessId) => {
    const [todayOrders, topProducts] = await Promise.all([
      listOrders(db, businessId, day),
      listTopProducts(db, businessId, week),
    ]);

    return { todayOrders, topProducts };
  });

  if (data === undefined) {
    return <NoWarungState />;
  }

  if (data.todayOrders.length === 0 && data.topProducts.length === 0) {
    return (
      <StateBlock
        icon={ShoppingBag}
        title="Belum ada orderan"
        description="Jumlah orderan hari ini dan produk terlaris minggu ini muncul setelah ada orderan pelanggan yang tercatat."
      />
    );
  }

  return (
    <div className="flex flex-col gap-section">
      <MetricBlock
        label="Orderan hari ini"
        value={`${formatNumber(data.todayOrders.length)} orderan`}
      />

      <div className="flex flex-col gap-2">
        <p className="text-metric-label text-muted-foreground">
          Produk terlaris minggu ini
        </p>
        {data.topProducts.length === 0 ? (
          <p className="text-body text-muted-foreground">
            Belum ada rincian produk pada orderan minggu ini.
          </p>
        ) : (
          <ul className="flex flex-col gap-gutter">
            {data.topProducts.map((product) => (
              <li
                key={product.productId}
                className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-body font-medium">{product.name}</span>
                <span className="text-caption text-muted-foreground">
                  Terjual {formatNumber(product.quantity)} {product.unit}, senilai{" "}
                  {formatRupiah(product.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
