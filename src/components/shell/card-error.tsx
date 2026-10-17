"use client";

import { catchError, type ErrorInfo } from "next/error";

import { ErrorState } from "@/components/shell/error-state";

type CardErrorProps = {
  /** Nama bagian yang dibungkus, dipakai pada kalimat keadaan gagal. */
  readonly title: string;
};

function CardErrorFallback({ title }: CardErrorProps, { retry }: ErrorInfo) {
  return <ErrorState title={title} onRetry={retry} />;
}

/**
 * Pembatas galat tingkat kartu.
 *
 * Dipasang di dalam kartu, sehingga satu bagian yang gagal tidak menjatuhkan
 * seluruh halaman, dan bagian lain tetap tampil. Cakupannya sengaja tidak
 * memuat judul kartu, supaya pemakai tetap tahu bagian mana yang gagal.
 */
export const CardError = catchError(CardErrorFallback);
