import { DraftFromAlert } from "./draft-from-alert";
import { CircleCheck } from "lucide-react";
import { connection } from "next/server";

import { LowStockBadge } from "@/components/shell/low-stock-badge";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { listProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";
import { listStockAlerts } from "@/lib/data/stock";
import { formatDateTime } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";

/** Kerangka muat untuk daftar alert stok. */
export function StockAlertListSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-2 border-b border-border pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  );
}

/**
 * Seluruh alert stok yang masih aktif, yang paling baru lebih dulu.
 *
 * Yang ditampilkan adalah stok saat ini, bukan stok saat alert dibuat, karena
 * pemilik warung bertanya tentang sisa barang hari ini. Waktu alert tetap
 * ditampilkan supaya jelas sejak kapan barang itu menipis.
 */
export async function StockAlertList() {
  await connection();

  const data = await withCurrentBusiness(async (db, businessId) => {
    const [alerts, products] = await Promise.all([
      listStockAlerts(db, businessId, "aktif"),
      listProducts(db, businessId),
    ]);

    return { alerts, products };
  });

  if (data === undefined) {
    return <NoWarungState />;
  }

  const productsById = new Map(data.products.map((product) => [product.id, product]));
  const alerts = data.alerts.flatMap((alert) => {
    const product = productsById.get(alert.productId);

    return product === undefined ? [] : [{ alert, product }];
  });

  if (alerts.length === 0) {
    return (
      <StateBlock
        icon={CircleCheck}
        title="Tidak ada stok yang menipis"
        description="Semua produk berada di atas ambang minimum."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-section">
      {alerts.map(({ alert, product }) => (
        <li
          key={alert.id}
          data-testid="stock-alert"
          className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-medium">{product.name}</span>
            <LowStockBadge />
          </div>

          <dl className="flex flex-wrap gap-x-section gap-y-2">
            <div>
              <dt className="text-caption text-muted-foreground">Stok sekarang</dt>
              <dd className="text-body tabular-nums">
                {formatNumber(product.stock)} {product.unit}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">Ambang minimum</dt>
              <dd className="text-body tabular-nums">
                {formatNumber(alert.minimumStock)} {product.unit}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">Muncul sejak</dt>
              <dd className="text-body tabular-nums">
                {formatDateTime(alert.createdAt)}
              </dd>
            </div>
          </dl>
          <DraftFromAlert productId={product.id} />
        </li>
      ))}
    </ul>
  );
}
