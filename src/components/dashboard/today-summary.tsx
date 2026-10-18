import {
  CalendarDays,
  Receipt,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { connection } from "next/server";

import { MetricTile } from "@/components/dashboard/metric-tile";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { summarizeDay } from "@/lib/data/reports";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatDateWithDay } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";
import { cn } from "@/lib/utils";

/** Kerangka muat untuk T5.1: penjualan, pengeluaran, dan laba hari ini. */
export function TodaySummarySkeleton() {
  return (
    <div className="flex flex-col gap-gutter">
      <div className="grid gap-gutter md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-border p-4",
              index === 2 && "md:col-span-2 xl:col-span-1",
            )}
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-56" />
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
    <div className="flex flex-col gap-gutter">
      <div className="grid gap-gutter md:grid-cols-2 xl:grid-cols-3">
        <MetricTile
          label="Penjualan"
          value={formatRupiah(summary.sales)}
          icon={Wallet}
          tone="income"
          note="Uang masuk hari ini"
        />
        <MetricTile
          label="Pengeluaran"
          value={formatRupiah(summary.expenses)}
          icon={ReceiptText}
          tone="expense"
          note="Uang keluar hari ini"
        />
        <MetricTile
          className="md:col-span-2 xl:col-span-1"
          label={rugi ? "Rugi" : "Laba"}
          value={formatRupiah(summary.profit)}
          icon={rugi ? TrendingDown : TrendingUp}
          tone={rugi ? "loss" : "profit"}
          note={rugi ? "Pengeluaran melebihi penjualan" : "Setelah semua pengeluaran"}
        />
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        {formatDateWithDay(now)}, {formatNumber(summary.transactionCount)} transaksi
        tercatat
      </p>
    </div>
  );
}
