import type { ReactNode } from "react";

type StateBlockProps = {
  readonly title: string;
  /** Satu kalimat yang menerangkan keadaan, bukan mengulang judulnya. */
  readonly description: string;
  /** Satu tindakan lanjutan, hanya bila memang ada tujuan yang dapat dibuka. */
  readonly action?: ReactNode;
};

/**
 * Keadaan kosong atau gagal di dalam sebuah kartu bagian.
 *
 * Mengikuti arah neo-brutalism: teks tebal tanpa ikon hiasan. Judul singkat,
 * satu kalimat penjelasan, dan satu tindakan lanjutan bila ada.
 */
export function StateBlock({ title, description, action }: StateBlockProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <p className="text-section-title font-bold">{title}</p>
      <p className="max-w-md text-body font-medium text-muted-foreground">
        {description}
      </p>
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}
