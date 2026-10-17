"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Tombol muat ulang dan penyegaran berkala agar pesan baru muncul. */
export function InboxRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw aria-hidden="true" className={pending ? "animate-spin" : undefined} />
      {pending ? "Memperbarui" : "Perbarui"}
    </Button>
  );
}
