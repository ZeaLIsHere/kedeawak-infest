"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  cancelWhatsAppOrderAction,
  confirmWhatsAppOrderAction,
} from "@/lib/actions/whatsapp";

const METHODS = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "qris", label: "QRIS" },
] as const;

type Method = (typeof METHODS)[number]["value"];

export function ConfirmOrder({ orderId }: { readonly orderId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("tunai");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");

  function confirm() {
    setMessage("");
    setFailed(false);

    startTransition(async () => {
      const result = await confirmWhatsAppOrderAction(orderId, method);
      setFailed(!result.ok);
      setMessage(result.ok ? result.message : result.error);
      if (result.ok) router.refresh();
    });
  }

  function cancel() {
    setCancelError("");

    startTransition(async () => {
      const result = await cancelWhatsAppOrderAction(orderId);
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      setCancelOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <label className="flex flex-col gap-1 text-caption font-medium">
        Jenis pembayaran
        <select
          value={method}
          disabled={pending}
          onChange={(event) => setMethod(event.target.value as Method)}
          className="min-h-11 rounded-md border-2 border-border bg-card px-2 text-sm font-medium shadow-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {METHODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <Button type="button" className="min-h-11" disabled={pending} onClick={confirm}>
        <Check aria-hidden="true" />
        {pending ? "Mengonfirmasi" : "Konfirmasi pesanan"}
      </Button>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="min-h-11" disabled={pending}>
            Batalkan pesanan
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Batalkan pesanan</DialogTitle>
          <DialogDescription>
            Yakin ingin membatalkan pesanan ini? Pesanan yang dibatalkan tidak dapat
            dikonfirmasi lagi.
          </DialogDescription>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={pending}
              onClick={cancel}
            >
              {pending ? "Membatalkan" : "Ya, batalkan pesanan"}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => setCancelOpen(false)}
            >
              Kembali
            </Button>
          </div>
          {cancelError && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {cancelError}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {message && (
        <p
          role={failed ? "alert" : "status"}
          className={`text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
