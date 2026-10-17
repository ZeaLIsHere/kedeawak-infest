"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { draftFromAlertAction } from "@/lib/actions/persetujuan";
export function DraftFromAlert({ productId }: { productId: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-2 flex flex-col items-start gap-2">
      <Button
        variant="outline"
        className="min-h-11"
        disabled={pending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              const result = await draftFromAlertAction(productId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setNotice("Draft pesanan tersedia di halaman Persetujuan.");
              router.refresh();
            } catch {
              setError("Draft belum dibuat. Periksa koneksi lalu coba lagi.");
            }
          });
        }}
      >
        {pending ? "Membuat draft" : "Buat draft pesanan"}
      </Button>
      {notice && (
        <>
          <p role="status" className="text-body">
            {notice}
          </p>
          <Link
            href="/persetujuan"
            className="flex min-h-11 items-center text-body font-medium text-primary underline underline-offset-4"
          >
            Periksa persetujuan
          </Link>
        </>
      )}
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
