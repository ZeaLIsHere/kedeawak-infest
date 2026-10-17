import { TrendingDown, TrendingUp } from "lucide-react";

import { MetricBlock } from "@/components/shell/metric-block";
import { Skeleton } from "@/components/shell/skeleton";
import type { FinancialSummary } from "@/lib/data/reports";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

/** Kerangka muat untuk ringkasan periode. */
export function PeriodSummarySkeleton() {
  return (
    <div className="grid gap-section sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((column) => (
        <div key={column} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Ringkasan keuangan satu periode.
 *
 * Laba negatif ditulis `Rugi` diikuti nilai mutlaknya, karena tanda minus
 * dilarang tampil di antarmuka. Arah laba juga ditandai ikon, sehingga warna
 * bukan satu satunya penanda, sesuai DESIGN.md bagian 5.
 */
export function PeriodSummary({ summary }: { readonly summary: FinancialSummary }) {
  const rugi = summary.profit < 0;

  return (
    <div className="grid gap-section sm:grid-cols-2 lg:grid-cols-4">
      <MetricBlock label="Penjualan" value={formatRupiah(summary.sales)} tone="income" />
      <MetricBlock
        label="Pengeluaran"
        value={formatRupiah(summary.expenses)}
        tone="expense"
      />
      <MetricBlock
        label={rugi ? "Rugi" : "Laba"}
        value={formatRupiah(summary.profit)}
        tone={rugi ? "loss" : "profit"}
        icon={rugi ? TrendingDown : TrendingUp}
      />
      <MetricBlock
        label="Jumlah transaksi"
        value={formatNumber(summary.transactionCount)}
      />
    </div>
  );
}
