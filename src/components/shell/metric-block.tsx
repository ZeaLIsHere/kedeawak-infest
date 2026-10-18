import { cn } from "@/lib/utils";

/** Warna nilai: biasa, pemasukan, pengeluaran, laba, atau kerugian. */
export type MetricTone = "default" | "income" | "expense" | "profit" | "loss";

type MetricBlockProps = {
  readonly label: string;
  /** Nilai yang sudah diformat, termasuk kata arah seperti `Rugi`. */
  readonly value: string;
  readonly note?: string;
  readonly tone?: MetricTone;
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
export function MetricBlock({ label, value, note, tone = "default" }: MetricBlockProps) {
  return (
    <div>
      <p className="text-metric-label font-bold text-muted-foreground">{label}</p>
      <p className={cn("text-metric font-bold tabular-nums", TONE_CLASS[tone])}>
        {value}
      </p>
      {note === undefined ? null : (
        <p className="mt-1 text-caption font-medium text-muted-foreground">{note}</p>
      )}
    </div>
  );
}
