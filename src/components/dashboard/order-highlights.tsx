import { connection } from "next/server";

import { MetricTile } from "@/components/dashboard/metric-tile";
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
    <div className="grid gap-gutter md:grid-cols-5">
      <div className="flex flex-col gap-3 rounded-md border-2 border-border p-4 md:col-span-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex flex-col gap-3 md:col-span-3">
        <Skeleton className="h-5 w-40" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
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
        title="Belum ada orderan"
        description="Jumlah orderan hari ini dan produk terlaris minggu ini muncul setelah ada orderan pelanggan yang tercatat."
      />
    );
  }

  const highestQuantity = Math.max(
    ...data.topProducts.map((product) => product.quantity),
    0,
  );

  return (
    <div className="grid items-start gap-gutter md:grid-cols-5 md:gap-section">
      <div className="min-w-0 md:col-span-2">
        <MetricTile
          className="bg-accent"
          label="Orderan hari ini"
          value={formatNumber(data.todayOrders.length)}
          note="Dari kasir dan WhatsApp"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-gutter md:col-span-3">
        <p className="text-body font-bold">Produk terlaris minggu ini</p>

        {data.topProducts.length === 0 ? (
          <p className="text-body font-medium text-muted-foreground">
            Belum ada rincian produk pada orderan minggu ini.
          </p>
        ) : (
          <ul className="flex flex-col gap-gutter">
            {data.topProducts.map((product, index) => {
              /*
               * Lebar batang dihitung dari data penjualan, bukan nilai desain,
               * supaya perbandingan antraproduk tetap terbaca di layar sempit.
               */
              const width =
                highestQuantity > 0
                  ? Math.max(8, Math.round((product.quantity / highestQuantity) * 100))
                  : 0;

              return (
                <li key={product.productId} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-border bg-card text-caption font-bold tabular-nums">
                    {formatNumber(index + 1)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-body font-bold">{product.name}</span>
                      <span className="text-body font-bold tabular-nums">
                        {formatNumber(product.quantity)} {product.unit}
                      </span>
                    </div>
                    <span className="text-caption font-medium text-muted-foreground">
                      Senilai {formatRupiah(product.revenue)}
                    </span>
                    <div
                      aria-hidden="true"
                      className="mt-1 h-3 overflow-hidden rounded-full border-2 border-border bg-card"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
