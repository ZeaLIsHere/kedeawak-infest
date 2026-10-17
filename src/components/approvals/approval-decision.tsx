"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decideApprovalAction } from "@/lib/actions/persetujuan";
export function ApprovalDecision({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function decide(decision: "disetujui" | "ditolak") {
    setError("");
    startTransition(async () => {
      try {
        const result = await decideApprovalAction(approvalId, decision);
        if (!result.ok) {
          setError(result.error);
          router.refresh();
          return;
        }
        router.refresh();
      } catch {
        setError("Keputusan belum tersimpan. Periksa koneksi lalu coba lagi.");
      }
    });
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          className="min-h-11"
          disabled={pending}
          onClick={() => decide("disetujui")}
        >
          {pending ? "Menyimpan keputusan" : "Setujui"}
        </Button>
        <Button
          className="min-h-11"
          variant="destructive"
          disabled={pending}
          onClick={() => decide("ditolak")}
        >
          Tolak
        </Button>
      </div>
    </div>
  );
}
