import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardTone = "brand" | "warning";

type SectionCardProps = {
  readonly title: string;
  /** Satu kalimat yang menambah keterangan, bukan mengulang judulnya. */
  readonly description?: string;
  /** Ikon kecil di samping judul untuk menandai jenis data pada kartu. */
  readonly icon?: LucideIcon;
  readonly tone?: SectionCardTone;
  readonly children: ReactNode;
};

/*
 * Warna ikon mengikuti makna kartu. Hijau dipakai untuk data umum dan
 * keuangan, kuning khusus peringatan, sesuai aturan warna di `DESIGN.md`.
 */
const ICON_TONE: Record<SectionCardTone, string> = {
  brand: cn("bg-accent text-accent-foreground"),
  warning: cn("bg-warning-surface text-warning-foreground"),
};

/**
 * Permukaan kartu untuk satu bagian data di dalam permukaan aplikasi.
 *
 * Judul bagian memakai ukuran `section-title`, permukaannya `card`, garisnya
 * `border`, sudut dan bayangannya mengikuti token, sesuai DESIGN.md bagian 7.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  tone = "brand",
  children,
}: SectionCardProps) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-[var(--card-padding)] shadow-card">
      <div className="flex items-start gap-3">
        {Icon === undefined ? null : (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md",
              ICON_TONE[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-section-title font-semibold">{title}</h2>
          {description === undefined ? null : (
            <p className="mt-1 text-body text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
