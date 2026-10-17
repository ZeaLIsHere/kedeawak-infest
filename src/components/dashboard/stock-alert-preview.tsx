import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";
import { listStockAlerts } from "@/lib/data/stock";
import { formatNumber } from "@/lib/format/number";

/** Jumlah alert yang ditampilkan ringkas. Sisanya dibuka pada halaman Stok. */
const PREVIEW_LIMIT = 3;

/** Kerangka muat untuk T5.3: ringkasan alert stok terbaru. */
export function StockAlertPreviewSkeleton() {
  return (
    <div className="flex flex-col gap-gutter">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-2 border-b border-border pb-2 last:border-b-0"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      ))}
    </div>
  );
}

/**
 * Beberapa alert stok menipis yang paling baru (T5.3).
 *
 * Alert dibaca dari tabel alert, bukan disimpulkan dari keadaan stok produk,
 * supaya yang tampil memang alert yang tercatat beserta waktunya.
 */
export async function StockAlertPreview() {
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

  const tautanStok = (
    <Button asChild variant="outline" className="min-h-touch self-start px-4">
      <Link href="/stok">Buka halaman Stok</Link>
    </Button>
  );

  if (alerts.length === 0) {
    return (
      <StateBlock
        icon={CircleCheck}
        title="Tidak ada stok yang menipis"
        description="Semua produk berada di atas ambang minimum."
        action={tautanStok}
      />
    );
  }

  return (
    <div className="flex flex-col gap-section">
      <ul className="flex flex-col gap-gutter">
        {alerts.slice(0, PREVIEW_LIMIT).map(({ alert, product }) => (
          <li
            key={alert.id}
            className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium">{product.name}</span>
              <Badge variant="warning">
                <TriangleAlert aria-hidden="true" />
                Stok menipis
              </Badge>
            </div>
            <span className="text-caption text-muted-foreground">
              Stok sekarang {formatNumber(product.stock)} {product.unit}, ambang minimum{" "}
              {formatNumber(product.minimumStock)} {product.unit}
            </span>
          </li>
        ))}
      </ul>

      {alerts.length > PREVIEW_LIMIT ? (
        <p className="text-caption text-muted-foreground">
          {formatNumber(alerts.length - PREVIEW_LIMIT)} produk lain juga menipis.
        </p>
      ) : null}

      {tautanStok}
    </div>
  );
}
