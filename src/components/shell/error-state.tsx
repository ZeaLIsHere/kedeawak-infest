"use client";

import { StateBlock } from "@/components/shell/state-block";
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
 * DESIGN.md bagian 7.
 */
export function ErrorState({ title, onRetry }: ErrorStateProps) {
  return (
    <StateBlock
      title={`${title} gagal dimuat`}
      description="Terjadi kesalahan saat membaca data warung. Coba lagi sebentar lagi."
      action={
        <Button
          type="button"
          variant="secondary"
          className="min-h-touch px-4"
          onClick={onRetry}
        >
          Coba lagi
        </Button>
      }
    />
  );
}
