import type { ReactNode } from "react";

type SectionCardProps = {
  readonly title: string;
  /** Satu kalimat yang menambah keterangan, bukan mengulang judulnya. */
  readonly description?: string;
  readonly children: ReactNode;
};

/**
 * Permukaan kartu untuk satu bagian data di dalam permukaan aplikasi.
 *
 * Gaya neo-brutalism: latar putih, garis hitam tebal, sudut kecil, dan bayangan
 * keras tanpa blur. Tidak ada ikon di kepala kartu, sesuai arah visual yang
 * dipilih pemilik pada 18 Oktober 2026.
 */
export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="min-w-0 rounded-md border-2 border-border bg-card p-[var(--card-padding)] shadow-card">
      <h2 className="text-section-title font-bold">{title}</h2>
      {description === undefined ? null : (
        <p className="mt-1 text-body font-medium text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
