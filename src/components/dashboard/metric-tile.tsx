import { cn } from "@/lib/utils";

/** Makna ubin ringkasan mengikuti warna keuangan yang sudah berlaku. */
type MetricTileTone = "default" | "income" | "expense" | "profit" | "loss";

type MetricTileProps = {
  readonly label: string;
  /** Nilai yang sudah diformat, termasuk kata arah seperti `Rugi`. */
  readonly value: string;
  readonly note?: string;
  readonly tone?: MetricTileTone;
  readonly className?: string;
};

/*
 * Nama kelas disusun lewat `cn` supaya terbaca sebagai satu kesatuan gaya,
 * bukan sebagai teks antarmuka. Latar memakai warna blok yang pekat dengan
 * teks hitam, supaya angka tetap terbaca tanpa bergantung pada warna.
 * Kerugian memakai warna pengeluaran karena keduanya menandakan uang keluar.
 */
const TONE_CLASS: Record<MetricTileTone, string> = {
  default: cn("bg-card"),
  income: cn("bg-income-surface"),
  expense: cn("bg-expense-surface"),
  profit: cn("bg-profit-surface"),
  loss: cn("bg-expense-surface"),
};

/**
 * Satu angka penting pada dasbor, dibingkai sebagai blok warna tersendiri.
 *
 * Tidak memakai ikon. Jenis angka dinyatakan oleh label dan kata, bukan oleh
 * warna atau gambar.
 */
export function MetricTile({
  label,
  value,
  note,
  tone = "default",
  className,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border-2 border-border p-4 text-foreground shadow-card",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className="text-metric-label font-bold">{label}</span>
      <span className="text-metric font-bold tabular-nums">{value}</span>
      {note === undefined ? null : (
        <span className="text-caption font-medium">{note}</span>
      )}
    </div>
  );
}
