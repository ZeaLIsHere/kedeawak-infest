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
 * Judul bagian memakai ukuran `section-title`, permukaannya `card`, garisnya
 * `border`, sudut dan bayangannya mengikuti token, sesuai DESIGN.md bagian 7.
 */
export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h2 className="text-section-title font-semibold">{title}</h2>
      {description === undefined ? null : (
        <p className="mt-1 text-caption text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
