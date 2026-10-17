"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductForm } from "./product-form";
import { archiveProductAction, restoreProductAction } from "@/lib/actions/produk";
import type { listProducts } from "@/lib/data/products";

type Product = Awaited<ReturnType<typeof listProducts>>[number];
export function ProductActions({
  product,
  archived = false,
}: {
  product: Product;
  archived?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "archive" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function mutate() {
    setError("");
    startTransition(async () => {
      try {
        const result = archived
          ? await restoreProductAction(product.id)
          : await archiveProductAction(product.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMode(null);
        router.refresh();
      } catch {
        setError("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.");
      }
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {archived ? (
        <Button
          className="min-h-11"
          variant="outline"
          disabled={pending}
          onClick={mutate}
        >
          {pending ? "Mengaktifkan produk" : "Aktifkan kembali"}
        </Button>
      ) : (
        <>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => {
              setError("");
              setMode("edit");
            }}
          >
            Ubah
          </Button>
          <Button
            className="min-h-11"
            variant="ghost"
            onClick={() => {
              setError("");
              setMode("archive");
            }}
          >
            Arsipkan
          </Button>
        </>
      )}
      {error && mode === null && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setMode(null);
        }}
      >
        <DialogContent>
          {mode === "edit" ? (
            <ProductForm initial={product} onSaved={() => setMode(null)} />
          ) : (
            <>
              <DialogTitle>Arsipkan produk ini</DialogTitle>
              <DialogDescription>
                Produk tidak lagi muncul di Kasir dan daftar produk. Riwayat transaksinya
                tetap utuh.
              </DialogDescription>
              <p className="mt-4 text-body font-medium">{product.name}</p>
              {error && (
                <p role="alert" className="mt-3 text-body text-destructive">
                  {error}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  className="min-h-11"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setMode(null)}
                >
                  Batal
                </Button>
                <Button
                  className="min-h-11"
                  variant="destructive"
                  disabled={pending}
                  onClick={mutate}
                >
                  {pending ? "Mengarsipkan produk" : "Arsipkan produk"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
