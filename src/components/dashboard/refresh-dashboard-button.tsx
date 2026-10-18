"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Memuat ulang ringkasan dashboard tanpa memuat ulang seluruh halaman. */
export function RefreshDashboardButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
      {pending ? "Memperbarui ringkasan" : "Perbarui ringkasan"}
    </Button>
  );
}
