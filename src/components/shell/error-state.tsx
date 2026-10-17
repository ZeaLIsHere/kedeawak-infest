"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  /** Nama bagian yang gagal, misalnya `Ringkasan hari ini`. */
  readonly title: string;
  readonly onRetry: () => void;
};

/**
 * Keadaan gagal untuk satu bagian data.
 *
 * Berisi sebab yang dapat dimengerti dan satu tombol untuk mencoba lagi, sesuai
 * DESIGN.md bagian 7. Ikon pendamping dipakai karena keadaan gagal tidak boleh
 * hanya dibedakan oleh warna.
 */
export function ErrorState({ title, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong bg-card p-5"
    >
      <TriangleAlert aria-hidden="true" className="size-8 text-expense" />
      <p className="text-section-title font-semibold">{title} gagal dimuat</p>
      <p className="max-w-md text-body text-muted-foreground">
        Terjadi kesalahan saat membaca data warung. Coba lagi sebentar lagi.
      </p>
      <Button type="button" variant="secondary" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}
