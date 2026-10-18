import { Skeleton } from "@/components/shell/skeleton";
import { StateBlock } from "@/components/shell/state-block";
import type { listTransactionsWithItems } from "@/lib/data/transactions";
import { formatDate, formatTime } from "@/lib/format/date";
import { transactionKindLabel, transactionSourceLabel } from "@/lib/ui-copy/labels";

import { TransactionDetail } from "./transaction-detail";

/**
 * Satu baris transaksi sebagaimana dikembalikan lapisan data.
 *
 * Tipenya diturunkan dari fungsi lapisan data, bukan diambil dari `src/lib/db`,
 * karena komponen tidak boleh menyentuh lapisan basis data.
 */
type TransactionRow = Awaited<ReturnType<typeof listTransactionsWithItems>>[number];

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

function paymentMethodLabel(method: TransactionRow["method"]): string | null {
  if (method === "tunai") return "Tunai";
  if (method === "transfer") return "Transfer";
  if (method === "qris") return "QRIS";
  return null;
}

/**
 * Rincian setiap transaksi pada periode yang dipilih, yang paling baru lebih
 * dulu. Setiap baris dapat ditekan untuk membuka rincian item dan totalnya.
 */
export function TransactionList({
  transactions,
}: {
  readonly transactions: readonly TransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <StateBlock
        title="Belum ada transaksi pada periode ini"
        description="Ringkasan akan terisi setelah ada penjualan atau pengeluaran yang tercatat."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-section">
      {transactions.map((transaction) => {
        const methodLabel =
          transaction.kind === "sale"
            ? (paymentMethodLabel(transaction.method) ?? "Pembayaran belum diketahui")
            : null;

        return (
          <li
            key={transaction.id}
            className="border-b border-border pb-3 last:border-b-0 last:pb-0"
          >
            <TransactionDetail
              transaction={{
                description: transaction.description,
                amount: transaction.amount,
                dateLabel: formatDate(transaction.occurredAt),
                timeLabel: formatTime(transaction.occurredAt),
                kindLabel: transactionKindLabel(transaction.kind),
                methodLabel,
                sourceLabel: transactionSourceLabel(transaction.source),
                items: transaction.items,
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
