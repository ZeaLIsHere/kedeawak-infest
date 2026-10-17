import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/shell/skeleton";
import { cn } from "@/lib/utils";

/** Pilihan periode yang dikenali halaman laporan. */
export type ReportMode = "harian" | "mingguan";

/** Pilihan periode beserta alamatnya. Mengganti periode kembali ke hari ini. */
const MODE_LINKS: readonly {
  readonly mode: ReportMode;
  readonly text: string;
  readonly href: string;
}[] = [
  { mode: "harian", text: "Harian", href: "/laporan?periode=harian" },
  { mode: "mingguan", text: "Mingguan", href: "/laporan?periode=mingguan" },
];

type PeriodSwitcherProps = {
  readonly mode: ReportMode;
  /** Nama periode yang sedang dibuka, misalnya `Sabtu, 17 Oktober 2026`. */
  readonly label: string;
  readonly previousHref: string;
  readonly nextHref: string;
};

/** Kerangka muat untuk pemilih periode. */
export function PeriodSwitcherSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-gutter">
      <Skeleton className="h-touch w-48" />
      <Skeleton className="h-touch w-72" />
    </div>
  );
}

/**
 * Pemilih periode laporan: rentang harian atau mingguan, satu periode mundur,
 * dan satu periode maju.
 *
 * Tautan periode memuat tanggalnya di alamat, sehingga pilihan periode dapat
 * dibagikan atau disimpan. Sasaran sentuhnya mengikuti `--touch-target-min`.
 */
export function PeriodSwitcher({
  mode,
  label,
  previousHref,
  nextHref,
}: PeriodSwitcherProps) {
  const navLinkClass = cn(
    "flex min-h-touch items-center gap-1 rounded-md border border-border px-3 font-medium transition-colors hover:bg-muted",
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-gutter">
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {MODE_LINKS.map((item) => (
          <Link
            key={item.mode}
            href={item.href}
            aria-current={item.mode === mode ? "page" : undefined}
            className={cn(
              "flex min-h-touch items-center rounded-md px-4 font-medium transition-colors",
              item.mode === mode
                ? cn("bg-secondary text-secondary-foreground")
                : cn("text-muted-foreground hover:bg-muted hover:text-foreground"),
            )}
          >
            {item.text}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-gutter">
        <Link href={previousHref} className={navLinkClass}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          {mode === "harian" ? "Hari sebelumnya" : "Minggu sebelumnya"}
        </Link>

        <span className="text-body font-medium tabular-nums">{label}</span>

        <Link href={nextHref} className={navLinkClass}>
          {mode === "harian" ? "Hari berikutnya" : "Minggu berikutnya"}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
