import { connection } from "next/server";
import { LowStockBadge } from "@/components/shell/low-stock-badge";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { AddProduct } from "./add-product";
import { ProductActions } from "./product-actions";
import { listProducts, listArchivedProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

export function ProductListSkeleton() {
  return <Skeleton className="h-72 w-full" />;
}
export async function ProductList() {
  await connection();
  const data = await withCurrentBusiness(async (db, businessId) => {
    const [products, archived] = await Promise.all([
      listProducts(db, businessId),
      listArchivedProducts(db, businessId),
    ]);
    return { products, archived };
  });
  if (!data) return <NoWarungState />;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <AddProduct />
      </div>
      {!data.products.length && (
        <p className="text-body text-muted-foreground">
          Belum ada produk tercatat. Tambah produk untuk mulai mencatat penjualan.
        </p>
      )}
      <ul className="grid gap-gutter lg:grid-cols-2">
        {data.products.map((product) => (
          <li
            data-testid="product-row"
            key={product.id}
            className="flex flex-col gap-3 rounded-md border border-border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body font-medium">{product.name}</h3>
              {product.stock < product.minimumStock && <LowStockBadge />}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-caption">
              <dt className="text-muted-foreground">Satuan</dt>
              <dd>{product.unit}</dd>
              <dt className="text-muted-foreground">Harga jual</dt>
              <dd className="tabular-nums">{formatRupiah(product.salePrice)}</dd>
              <dt className="text-muted-foreground">Harga beli</dt>
              <dd className="tabular-nums">{formatRupiah(product.purchasePrice)}</dd>
              <dt className="text-muted-foreground">Stok</dt>
              <dd data-testid="product-stock" className="tabular-nums">
                {formatNumber(product.stock)}
              </dd>
              <dt className="text-muted-foreground">Ambang minimum</dt>
              <dd className="tabular-nums">{formatNumber(product.minimumStock)}</dd>
            </dl>
            <ProductActions product={product} />
          </li>
        ))}
      </ul>
      <details className="rounded-md border border-border p-4">
        <summary className="min-h-11 cursor-pointer text-body font-medium">
          Produk arsip
        </summary>
        {!data.archived.length ? (
          <p className="mt-3 text-body text-muted-foreground">
            Belum ada produk arsip. Produk yang diarsipkan dapat diaktifkan kembali di
            sini.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {data.archived.map((product) => (
              <li
                data-testid="archived-product"
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
              >
                <span className="text-body">{product.name}</span>
                <ProductActions product={product} archived />
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
