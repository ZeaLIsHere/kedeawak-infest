"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmWhatsAppOrderAction } from "@/lib/actions/whatsapp";

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

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <label className="flex flex-col gap-1 text-caption font-medium">
        Jenis pembayaran
        <select
          value={method}
          disabled={pending}
          onChange={(event) => setMethod(event.target.value as Method)}
          className="min-h-11 rounded-md border border-border bg-background px-2 text-sm"
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
