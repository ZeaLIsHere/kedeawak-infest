"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { listProducts } from "@/lib/data/products";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";
import type { CartLine } from "./cart-items";

type Props = {
  products: Awaited<ReturnType<typeof listProducts>>;
  items: CartLine[];
  search: string;
  onSearch: (value: string) => void;
  onQuantity: (id: string, amount: number) => void;
  pending: boolean;
};
export function ProductCatalog({
  products,
  items,
  search,
  onSearch,
  onQuantity,
  pending,
}: Props) {
  const visible = products.filter((product) =>
    product.name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id")),
  );
  return (
    <>
      <label htmlFor="product-search" className="text-caption font-medium">
        Cari produk
      </label>
      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="absolute top-3 left-3 size-5 text-muted-foreground"
        />
        <Input
          id="product-search"
          className="pl-10"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((product) => {
          const count =
            items.find((item) => item.productId === product.id)?.quantity ?? 0;
          const empty = count >= product.stock;
          return (
            <button
              data-testid="cashier-product"
              data-stock={product.stock}
              data-product-name={product.name}
              key={product.id}
              disabled={pending || empty}
              onClick={() => onQuantity(product.id, count + 1)}
              className="flex min-h-28 flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <span className="text-body font-medium">{product.name}</span>
              <span className="text-body tabular-nums">
                {formatRupiah(product.salePrice)}
              </span>
              <span className="text-caption text-muted-foreground">
                {empty
                  ? "Stok habis"
                  : `Tersedia ${formatNumber(product.stock - count)} ${product.unit}`}
              </span>
            </button>
          );
        })}
      </div>
      {!visible.length && (
        <p className="mt-4 text-body text-muted-foreground">
          Produk tidak ditemukan. Gunakan nama lain atau tambah produk dari halaman Stok.
        </p>
      )}
    </>
  );
}
