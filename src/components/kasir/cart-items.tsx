"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { listProducts } from "@/lib/data/products";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

type Product = Awaited<ReturnType<typeof listProducts>>[number];
export type CartLine = { productId: string; quantity: number };
type Props = {
  items: CartLine[];
  products: Product[];
  disabled: boolean;
  onQuantity: (id: string, quantity: number) => void;
};
export function CartItems({ items, products, disabled, onQuantity }: Props) {
  if (!items.length)
    return (
      <p className="text-body text-muted-foreground">
        Keranjang masih kosong. Pilih produk untuk mencatat penjualan.
      </p>
    );
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const product = products.find((value) => value.id === item.productId);
        if (!product) return null;
        const full = item.quantity >= product.stock;
        return (
          <li
            data-testid="cart-item"
            key={item.productId}
            className="border-b border-border pb-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-body font-medium">{product.name}</span>
              <span className="text-body tabular-nums">
                {formatRupiah(product.salePrice * item.quantity)}
              </span>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              {formatRupiah(product.salePrice)} per {product.unit}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                className="size-11"
                variant="outline"
                disabled={disabled}
                aria-label={`Kurangi ${product.name}`}
                onClick={() => onQuantity(product.id, item.quantity - 1)}
              >
                <Minus aria-hidden="true" />
              </Button>
              <Input
                className="w-20 text-center tabular-nums"
                type="number"
                min={1}
                max={product.stock}
                step={1}
                aria-label={`Jumlah ${product.name}`}
                value={item.quantity}
                disabled={disabled}
                onChange={(event) =>
                  onQuantity(
                    product.id,
                    Math.max(1, Math.min(product.stock, Number(event.target.value) || 1)),
                  )
                }
              />
              <Button
                className="size-11"
                variant="outline"
                disabled={disabled || full}
                aria-label={`Tambah ${product.name}`}
                onClick={() => onQuantity(product.id, item.quantity + 1)}
              >
                <Plus aria-hidden="true" />
              </Button>
              <Button
                className="ml-auto size-11"
                variant="ghost"
                aria-label={`Hapus ${product.name}`}
                disabled={disabled}
                onClick={() => onQuantity(product.id, 0)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-2 text-caption text-muted-foreground">
              {full
                ? "Stok habis"
                : `Tersedia ${formatNumber(product.stock - item.quantity)} ${product.unit} lagi`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
