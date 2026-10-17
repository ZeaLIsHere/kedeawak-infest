"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket } from "lucide-react";
import { CartItems, type CartLine } from "./cart-items";
import { SaleAssistant } from "./sale-assistant";
import { ProductCatalog } from "./product-catalog";
import { SectionCard } from "@/components/shell/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSaleAction } from "@/lib/actions/penjualan";
import type { listProducts } from "@/lib/data/products";
import { formatRupiah } from "@/lib/format/currency";

type Props = { products: Awaited<ReturnType<typeof listProducts>> };
const METHODS = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "qris", label: "QRIS" },
] as const;
export function Cashier({ products }: Props) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<"tunai" | "transfer" | "qris">("tunai");
  const [cash, setCash] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const total = items.reduce(
    (sum, item) =>
      sum +
      (products.find((product) => product.id === item.productId)?.salePrice ?? 0) *
        item.quantity,
    0,
  );
  function quantity(id: string, value: number) {
    setNotice("");
    setItems((current) =>
      value <= 0
        ? current.filter((item) => item.productId !== id)
        : current.some((item) => item.productId === id)
          ? current.map((item) =>
              item.productId === id ? { ...item, quantity: value } : item,
            )
          : [...current, { productId: id, quantity: value }],
    );
  }
  function submit() {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        requestId.current ??= crypto.randomUUID();
        const result = await createSaleAction({
          requestId: requestId.current,
          items,
          method,
          ...(method === "tunai" ? { cashReceived: Number(cash) } : {}),
        });
        if (!result.ok) {
          setError(result.error);
          router.refresh();
          return;
        }
        requestId.current = null;
        setItems([]);
        setCash("");
        setMethod("tunai");
        setNotice(`Penjualan berhasil dicatat sebesar ${formatRupiah(result.total)}.`);
        router.refresh();
      } catch {
        setError("Penjualan belum tersimpan. Periksa koneksi lalu coba lagi.");
      }
    });
  }
  return (
    <div className="flex flex-col gap-section">
      {notice && (
        <p
          role="status"
          className="rounded-md border border-border bg-success-surface p-3 text-body"
        >
          {notice}
        </p>
      )}
      <div className="grid items-start gap-section lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-section">
          <SectionCard title="Pilih produk">
            <ProductCatalog
              products={products}
              items={items}
              search={search}
              onSearch={setSearch}
              onQuantity={quantity}
              pending={pending}
            />
          </SectionCard>
          <SectionCard title="Pesanan lewat suara">
            <SaleAssistant
              products={products}
              disabled={pending}
              onApply={(proposal) => {
                let limited = false;
                setItems((current) => {
                  const next = [...current];
                  for (const item of proposal) {
                    const product = products.find((value) => value.id === item.productId);
                    if (!product) continue;
                    const previous = next.find(
                      (value) => value.productId === item.productId,
                    );
                    const requested = (previous?.quantity ?? 0) + item.quantity;
                    const amount = Math.min(requested, product.stock);
                    if (amount < requested) limited = true;
                    if (previous) previous.quantity = amount;
                    else if (amount > 0) next.push({ ...item, quantity: amount });
                  }
                  return next;
                });
                setError(
                  limited
                    ? "Jumlah disesuaikan dengan stok yang tersedia. Periksa keranjang sebelum mencatat."
                    : "",
                );
              }}
            />
          </SectionCard>
        </div>
        <SectionCard title="Keranjang">
          <div className="flex flex-col gap-5">
            <CartItems
              items={items}
              products={products}
              disabled={pending}
              onQuantity={quantity}
            />
            <div className="flex justify-between gap-3 text-section-title font-semibold">
              <span>Total belanja</span>
              <span className="tabular-nums">{formatRupiah(total)}</span>
            </div>
            <fieldset disabled={pending}>
              <legend className="mb-2 text-caption font-medium">Jenis pembayaran</legend>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={option.value}
                      checked={method === option.value}
                      onChange={() => setMethod(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="cash-received" className="text-caption font-medium">
                Uang diterima
              </label>
              <Input
                id="cash-received"
                className="mt-2 tabular-nums"
                type="number"
                min={0}
                step={1}
                value={cash}
                disabled={pending || method !== "tunai"}
                onChange={(event) => setCash(event.target.value)}
              />
              {method === "tunai" && (
                <div className="mt-2 flex justify-between text-body">
                  <span>Kembalian</span>
                  <span className="tabular-nums">
                    {formatRupiah(Math.max(0, Number(cash) - total))}
                  </span>
                </div>
              )}
            </div>
            {error && (
              <p role="alert" className="text-body text-destructive">
                {error}
              </p>
            )}
            <Button
              className="min-h-11 w-full"
              disabled={
                pending || !items.length || (method === "tunai" && Number(cash) < total)
              }
              onClick={submit}
            >
              <ShoppingBasket aria-hidden="true" />
              {pending ? "Mencatat penjualan" : "Catat penjualan"}
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
