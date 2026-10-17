import { Receipt } from "lucide-react";

import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import { Badge } from "@/components/ui/badge";
import type { listTransactions } from "@/lib/data/transactions";
import { formatRupiah } from "@/lib/format/currency";
import { formatDate, formatTime } from "@/lib/format/date";
import { transactionKindLabel } from "@/lib/ui-copy/labels";

/**
 * Satu baris transaksi sebagaimana dikembalikan lapisan data.
 *
 * Tipenya diturunkan dari fungsi lapisan data, bukan diambil dari `src/lib/db`,
 * karena komponen tidak boleh menyentuh lapisan basis data.
 */
type TransactionRow = Awaited<ReturnType<typeof listTransactions>>[number];

/** Kerangka muat untuk rincian transaksi. */
export function TransactionListSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex flex-col gap-2 border-b border-border pb-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

/**
 * Rincian setiap transaksi pada periode yang dipilih, yang paling baru lebih
 * dulu. Nilainya selalu positif dan arahnya dibaca dari label jenis transaksi.
 */
export function TransactionList({
  transactions,
}: {
  readonly transactions: readonly TransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <StateBlock
        icon={Receipt}
        title="Belum ada transaksi pada periode ini"
        description="Ringkasan akan terisi setelah ada penjualan atau pengeluaran yang tercatat."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-section">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-gutter gap-y-1">
            <span className="text-body font-medium">{transaction.description}</span>
            <span className="text-body font-medium tabular-nums">
              {formatRupiah(transaction.amount)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-gutter gap-y-1">
            <span className="text-caption text-muted-foreground tabular-nums">
              {formatDate(transaction.occurredAt)}, {formatTime(transaction.occurredAt)}
            </span>
            <Badge variant="outline">{transactionKindLabel(transaction.kind)}</Badge>
            {transaction.kind === "sale" && (
              <span className="text-caption text-muted-foreground">
                {transaction.method === "tunai"
                  ? "Tunai"
                  : transaction.method === "transfer"
                    ? "Transfer"
                    : transaction.method === "qris"
                      ? "QRIS"
                      : "Pembayaran belum diketahui"}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
