import { Boxes } from "lucide-react";
import { connection } from "next/server";

import { LowStockBadge } from "@/components/shell/low-stock-badge";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { listProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

/** Kerangka muat untuk daftar produk. */
export function ProductListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Bagian data produk yang dipakai untuk menilai keadaan stoknya. */
type StockLevel = {
  readonly stock: number;
  readonly minimumStock: number;
};

/**
 * Baris tabel dan kartu memakai penilaian yang sama, yaitu stok di bawah ambang
 * minimum. Batasnya sama dengan batas yang dipakai `stock.ts` saat menaikkan
 * alert, sehingga lencana di sini dan alert di atasnya tidak pernah berbeda.
 */
function isLowStock(stockLevel: StockLevel): boolean {
  return stockLevel.stock < stockLevel.minimumStock;
}

function LowStockBadgeIfLow({ stockLevel }: { readonly stockLevel: StockLevel }) {
  return isLowStock(stockLevel) ? <LowStockBadge /> : null;
}

/**
 * Daftar produk warung beserta harga dan stoknya.
 *
 * Pada layar 768 piksel ke atas dipakai tabel, dan di bawahnya daftar kartu,
 * sesuai `DESIGN.md` bagian 6, supaya tidak ada gulir mendatar pada telepon.
 */
export async function ProductList() {
  await connection();

  const products = await withCurrentBusiness((db, businessId) =>
    listProducts(db, businessId),
  );

  if (products === undefined) {
    return <NoWarungState />;
  }

  if (products.length === 0) {
    return (
      <StateBlock
        icon={Boxes}
        title="Belum ada produk tercatat"
        description="Daftar harga dan sisa stok muncul setelah produk dicatat."
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Daftar produk warung beserta harga dan stoknya
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="py-2 pr-4 text-left text-caption font-medium text-muted-foreground"
              >
                Produk
              </th>
              <th
                scope="col"
                className="py-2 pr-4 text-left text-caption font-medium text-muted-foreground"
              >
                Satuan
              </th>
              <th
                scope="col"
                className="py-2 pl-4 text-right text-caption font-medium text-muted-foreground"
              >
                Harga jual
              </th>
              <th
                scope="col"
                className="py-2 pl-4 text-right text-caption font-medium text-muted-foreground"
              >
                Harga beli
              </th>
              <th
                scope="col"
                className="py-2 pl-4 text-right text-caption font-medium text-muted-foreground"
              >
                Stok
              </th>
              <th
                scope="col"
                className="py-2 pl-4 text-right text-caption font-medium text-muted-foreground"
              >
                Ambang minimum
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-b-0">
                <th scope="row" className="py-3 pr-4 text-left font-normal">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium">{product.name}</span>
                    <LowStockBadgeIfLow stockLevel={product} />
                  </span>
                </th>
                <td className="py-3 pr-4 text-body text-muted-foreground">
                  {product.unit}
                </td>
                <td className="py-3 pl-4 text-right text-body tabular-nums">
                  {formatRupiah(product.salePrice)}
                </td>
                <td className="py-3 pl-4 text-right text-body tabular-nums text-muted-foreground">
                  {formatRupiah(product.purchasePrice)}
                </td>
                <td className="py-3 pl-4 text-right text-body tabular-nums">
                  {formatNumber(product.stock)}
                </td>
                <td className="py-3 pl-4 text-right text-body tabular-nums text-muted-foreground">
                  {formatNumber(product.minimumStock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-gutter md:hidden">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-2 rounded-md border border-border p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium">{product.name}</span>
              <LowStockBadgeIfLow stockLevel={product} />
            </div>

            <dl className="grid grid-cols-2 gap-x-gutter gap-y-1">
              <dt className="text-caption text-muted-foreground">Satuan</dt>
              <dd className="text-caption">{product.unit}</dd>
              <dt className="text-caption text-muted-foreground">Harga jual</dt>
              <dd className="text-caption tabular-nums">
                {formatRupiah(product.salePrice)}
              </dd>
              <dt className="text-caption text-muted-foreground">Harga beli</dt>
              <dd className="text-caption tabular-nums">
                {formatRupiah(product.purchasePrice)}
              </dd>
              <dt className="text-caption text-muted-foreground">Stok</dt>
              <dd className="text-caption tabular-nums">{formatNumber(product.stock)}</dd>
              <dt className="text-caption text-muted-foreground">Ambang minimum</dt>
              <dd className="text-caption tabular-nums">
                {formatNumber(product.minimumStock)}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
