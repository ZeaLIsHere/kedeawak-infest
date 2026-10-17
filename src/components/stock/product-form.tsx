"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { saveProduct } from "@/lib/actions/produk";

export type ProductFields = {
  name: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  minimumStock: number;
};
type Props = { initial?: ProductFields & { id?: string }; onSaved: () => void };
const FIELDS = [
  { name: "name", label: "Nama produk", type: "text" },
  { name: "unit", label: "Satuan", type: "text" },
  { name: "salePrice", label: "Harga jual", type: "number" },
  { name: "purchasePrice", label: "Harga beli", type: "number" },
  { name: "stock", label: "Stok", type: "number" },
  { name: "minimumStock", label: "Ambang minimum", type: "number" },
] as const;
export function ProductForm({ initial, onSaved }: Props) {
  const id = useId();
  const router = useRouter();
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const stockChanged = initial?.id !== undefined && Number(stock) !== initial.stock;
  function submit(data: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveProduct(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
        onSaved();
      } catch {
        setError("Produk belum tersimpan. Periksa koneksi lalu coba lagi.");
      }
    });
  }
  return (
    <>
      <DialogTitle>
        {initial?.id ? "Ubah produk" : initial ? "Periksa data produk" : "Tambah produk"}
      </DialogTitle>
      <DialogDescription>
        Pastikan harga dalam rupiah dan stok sesuai persediaan warung.
      </DialogDescription>
      <form action={submit} className="mt-5 flex flex-col gap-4">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div
              key={field.name}
              className={field.name === "name" ? "sm:col-span-2" : ""}
            >
              <label className="text-caption font-medium" htmlFor={`${id}-${field.name}`}>
                {field.label}
              </label>
              <Input
                className="mt-1"
                id={`${id}-${field.name}`}
                name={field.name}
                type={field.type}
                required
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? 1 : undefined}
                {...(field.name === "stock"
                  ? { value: stock, onChange: (event) => setStock(event.target.value) }
                  : {
                      defaultValue:
                        initial?.[field.name] ?? (field.type === "number" ? 0 : ""),
                    })}
              />
            </div>
          ))}
          {initial?.id && (
            <div className="sm:col-span-2">
              <label className="text-caption font-medium" htmlFor={`${id}-reason`}>
                Alasan perubahan stok
              </label>
              <Input
                className="mt-1"
                id={`${id}-reason`}
                name="reason"
                required={stockChanged}
              />
              <p className="mt-1 text-caption text-muted-foreground">
                Wajib diisi bila jumlah stok berubah.
              </p>
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-body text-destructive">
            {error}
          </p>
        )}
        <Button className="min-h-11" type="submit" disabled={pending}>
          {pending ? "Menyimpan produk" : "Simpan produk"}
        </Button>
      </form>
    </>
  );
}
