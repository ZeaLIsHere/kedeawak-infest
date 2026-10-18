import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Makna ubin ringkasan mengikuti warna keuangan yang sudah berlaku. */
type MetricTileTone = "default" | "income" | "expense" | "profit" | "loss";

type MetricTileProps = {
  readonly label: string;
  /** Nilai yang sudah diformat, termasuk kata arah seperti `Rugi`. */
  readonly value: string;
  readonly icon: LucideIcon;
  readonly note?: string;
  readonly tone?: MetricTileTone;
  readonly className?: string;
};

/*
 * Nama kelas disusun lewat `cn` supaya terbaca sebagai satu kesatuan gaya,
 * bukan sebagai teks antarmuka. Kerugian memakai warna pengeluaran karena
 * keduanya sama sama menandakan uang keluar.
 */
const TONE_CLASS: Record<
  MetricTileTone,
  { readonly surface: string; readonly value: string }
> = {
  default: {
    surface: cn("bg-muted text-muted-foreground"),
    value: cn("text-foreground"),
  },
  income: {
    surface: cn("bg-income-surface text-income-foreground"),
    value: cn("text-income"),
  },
  expense: {
    surface: cn("bg-expense-surface text-expense-foreground"),
    value: cn("text-expense"),
  },
  profit: {
    surface: cn("bg-profit-surface text-profit-foreground"),
    value: cn("text-profit"),
  },
  loss: {
    surface: cn("bg-expense-surface text-expense-foreground"),
    value: cn("text-expense"),
  },
};

/**
 * Satu angka penting pada dasbor, dibingkai sebagai ubin tersendiri.
 *
 * Ikon diberi permukaan berwarna agar jenis angka terbaca sekilas, tetapi
 * maknanya tetap dinyatakan oleh label dan kata, bukan oleh warna saja.
 */
export function MetricTile({
  label,
  value,
  icon: Icon,
  note,
  tone = "default",
  className,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-background p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-metric-label font-medium text-muted-foreground">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            TONE_CLASS[tone].surface,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <span
        className={cn("text-metric font-semibold tabular-nums", TONE_CLASS[tone].value)}
      >
        {value}
      </span>
      {note === undefined ? null : (
        <span className="text-caption text-muted-foreground">{note}</span>
      )}
    </div>
  );
}
