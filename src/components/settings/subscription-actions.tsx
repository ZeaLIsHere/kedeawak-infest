"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { purchaseGoldAction, removeSubscriptionAction } from "@/lib/actions/subscription";

type DialogActionsProps = {
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly error: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

function DialogActions({
  confirmLabel,
  pending,
  error,
  onConfirm,
  onCancel,
}: DialogActionsProps) {
  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" disabled={pending} onClick={onConfirm}>
          {pending ? "Memproses" : confirmLabel}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={onCancel}
        >
          Batal
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tombol pembelian paket Gold dengan konfirmasi sebelum diaktifkan. */
export function BuyGoldButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function buy() {
    setError("");
    startTransition(async () => {
      const result = await purchaseGoldAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="min-h-11">
          Langganan Gold
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Beli paket Gold</DialogTitle>
        <DialogDescription>
          Yakin ingin membeli langganan ini? Paket Gold berlaku 30 hari dan membuka
          pesanan WhatsApp tanpa batas, suara, serta foto struk. Pembayaran pada demo ini
          hanya berupa konfirmasi.
        </DialogDescription>
        <DialogActions
          confirmLabel="Ya, beli langganan"
          pending={pending}
          error={error}
          onConfirm={buy}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Tombol penghapusan langganan, dipisah dari kartu pilihan paket. */
export function RemoveSubscriptionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    setError("");
    startTransition(async () => {
      const result = await removeSubscriptionAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="min-h-11">
          Hapus langganan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Hapus langganan</DialogTitle>
        <DialogDescription>
          Yakin ingin menghapus langganan? Warung kembali ke paket Free. Pesanan WhatsApp
          dibatasi 10 per hari dan fitur suara serta foto struk ditutup.
        </DialogDescription>
        <DialogActions
          confirmLabel="Ya, hapus langganan"
          pending={pending}
          error={error}
          onConfirm={remove}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
