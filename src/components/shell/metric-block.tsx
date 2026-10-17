import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Warna nilai: biasa, pemasukan, pengeluaran, laba, atau kerugian. */
export type MetricTone = "default" | "income" | "expense" | "profit" | "loss";

type MetricBlockProps = {
  readonly label: string;
  /** Nilai yang sudah diformat, termasuk kata arah seperti `Rugi`. */
  readonly value: string;
  readonly note?: string;
  readonly tone?: MetricTone;
  /**
   * Ikon pendamping nilai. Dipakai saat arah nilai perlu ditandai, karena
   * `DESIGN.md` melarang status yang hanya dibedakan oleh warna.
   */
  readonly icon?: LucideIcon;
};

/*
 * Nama kelas disusun lewat `cn` supaya terbaca sebagai satu kesatuan gaya,
 * bukan sebagai teks antarmuka. Perkakas `lint:ui` melewati argumen `cn`.
 *
 * Kerugian memakai warna pengeluaran, bukan warna tersendiri, karena keduanya
 * sama sama menandakan uang keluar. Laba dan rugi tetap terbaca dari kata pada
 * labelnya, sehingga warna bukan satu satunya penanda.
 */
const TONE_CLASS: Record<MetricTone, string> = {
  default: cn("text-foreground"),
  income: cn("text-income"),
  expense: cn("text-expense"),
  profit: cn("text-profit"),
  loss: cn("text-expense"),
};

/** Satu angka penting beserta labelnya. */
export function MetricBlock({
  label,
  value,
  note,
  tone = "default",
  icon: Icon,
}: MetricBlockProps) {
  return (
    <div>
      <p className="text-metric-label text-muted-foreground">{label}</p>
      <p className={cn("text-metric font-semibold tabular-nums", TONE_CLASS[tone])}>
        {Icon === undefined ? null : (
          <Icon aria-hidden="true" className="mr-2 inline size-6 align-text-bottom" />
        )}
        {value}
      </p>
      {note === undefined ? null : (
        <p className="mt-1 text-caption text-muted-foreground">{note}</p>
      )}
    </div>
  );
}
