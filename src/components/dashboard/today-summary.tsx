import { Receipt } from "lucide-react";
import { connection } from "next/server";

import { MetricBlock } from "@/components/shell/metric-block";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { summarizeDay } from "@/lib/data/reports";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatDateWithDay } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";

/** Kerangka muat untuk T5.1: penjualan, pengeluaran, dan laba hari ini. */
export function TodaySummarySkeleton() {
  return (
    <div className="grid gap-section sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Ringkasan keuangan hari ini menurut Waktu Indonesia Barat.
 *
 * Waktu diambil sesudah `connection()` supaya tidak dihitung saat prarender,
 * dan supaya batas hari yang dipakai sama dengan batas yang dipakai laporan.
 */
export async function TodaySummary() {
  await connection();

  const now = new Date();
  const summary = await withCurrentBusiness((db, businessId) =>
    summarizeDay(db, businessId, now),
  );

  if (summary === undefined) {
    return <NoWarungState />;
  }

  if (summary.transactionCount === 0) {
    return (
      <StateBlock
        icon={Receipt}
        title="Belum ada transaksi hari ini"
        description="Ringkasan penjualan, pengeluaran, dan laba terisi setelah ada transaksi yang tercatat hari ini."
      />
    );
  }

  const rugi = summary.profit < 0;

  return (
    <div className="flex flex-col gap-section">
      <div className="grid gap-section sm:grid-cols-3">
        <MetricBlock
          label="Penjualan"
          value={formatRupiah(summary.sales)}
          tone="income"
        />
        <MetricBlock
          label="Pengeluaran"
          value={formatRupiah(summary.expenses)}
          tone="expense"
        />
        <MetricBlock
          label={rugi ? "Rugi" : "Laba"}
          value={formatRupiah(summary.profit)}
          tone={rugi ? "loss" : "profit"}
        />
      </div>
      <p className="text-caption text-muted-foreground">
        {formatDateWithDay(now)}, {formatNumber(summary.transactionCount)} transaksi
        tercatat
      </p>
    </div>
  );
}
