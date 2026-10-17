"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createExpenseAction } from "@/lib/actions/pengeluaran";

export function ExpenseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setMessage("");
    setFailed(false);

    startTransition(async () => {
      const result = await createExpenseAction(data);

      if (!result.ok) {
        setFailed(true);
        setMessage(result.error);
        return;
      }

      form.reset();
      setMessage("Pengeluaran tersimpan dan masuk ke laporan.");
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Keterangan
          <Input
            name="description"
            maxLength={200}
            required
            placeholder="Contoh: Beli gas dan kantong plastik"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nominal
          <Input
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            inputMode="numeric"
            placeholder="Contoh: 50000"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tanggal
        <Input name="occurredAt" type="date" />
        <span className="text-caption font-normal text-muted-foreground">
          Kosongkan untuk memakai tanggal hari ini.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Menyimpan pengeluaran" : "Simpan pengeluaran"}
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
    </form>
  );
}
