"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";

/** Data yang aman dikirim dari server ke dialog rincian transaksi. */
export type TransactionDetailData = {
  readonly description: string;
  readonly amount: number;
  readonly dateLabel: string;
  readonly timeLabel: string;
  readonly kindLabel: string;
  readonly methodLabel: string | null;
  readonly sourceLabel: string;
  readonly items: readonly {
    readonly productId: string;
    readonly name: string;
    readonly unit: string;
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
};

/**
 * Baris transaksi yang dapat ditekan untuk membuka rincian.
 *
 * Item hanya ditampilkan bila transaksi memiliki orderan asal. Transaksi tanpa
 * item tetap menampilkan keterangan, nilai, jenis, sumber, dan waktu.
 */
export function TransactionDetail({
  transaction,
}: {
  readonly transaction: TransactionDetailData;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-col gap-1 rounded-sm text-left hover:bg-main/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="flex flex-wrap items-baseline justify-between gap-x-gutter gap-y-1">
            <span className="text-body font-bold">{transaction.description}</span>
            <span className="text-body font-bold tabular-nums">
              {formatRupiah(transaction.amount)}
            </span>
          </span>

          <span className="flex flex-wrap items-center gap-x-gutter gap-y-1">
            <span className="text-caption text-muted-foreground tabular-nums">
              {transaction.dateLabel}, {transaction.timeLabel}
            </span>
            <Badge variant="outline">{transaction.kindLabel}</Badge>
            {transaction.methodLabel !== null && (
              <span className="text-caption text-muted-foreground">
                {transaction.methodLabel}
              </span>
            )}
            <span className="text-caption font-bold underline underline-offset-4">
              Lihat rincian
            </span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Rincian transaksi</DialogTitle>
        <DialogDescription>
          {transaction.description}. {transaction.dateLabel}, {transaction.timeLabel}.
        </DialogDescription>

        <dl className="mt-4 grid grid-cols-2 gap-x-gutter gap-y-2 border-y-2 border-border py-3 text-body">
          <dt className="text-muted-foreground">Jenis</dt>
          <dd className="text-right font-bold">{transaction.kindLabel}</dd>
          <dt className="text-muted-foreground">Sumber</dt>
          <dd className="text-right font-bold">{transaction.sourceLabel}</dd>
          {transaction.methodLabel !== null && (
            <>
              <dt className="text-muted-foreground">Metode</dt>
              <dd className="text-right font-bold">{transaction.methodLabel}</dd>
            </>
          )}
        </dl>

        {transaction.items.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-body font-bold">Rincian item</h3>
            <ul className="mt-2 flex flex-col">
              {transaction.items.map((item, index) => (
                <li
                  key={`${item.productId}-${index}`}
                  className="border-b border-border py-2 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-body font-bold">{item.name}</span>
                    <span className="text-body font-bold tabular-nums">
                      {formatRupiah(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground tabular-nums">
                    {formatNumber(item.quantity)} {item.unit} x{" "}
                    {formatRupiah(item.unitPrice)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-body font-medium text-muted-foreground">
            Transaksi ini tidak memiliki rincian item. Nilai dan keterangannya tercatat
            pada ringkasan di atas.
          </p>
        )}

        <div className="mt-3 flex items-baseline justify-between border-t-2 border-border pt-3">
          <span className="text-body font-bold">Total transaksi</span>
          <span className="text-body font-bold tabular-nums">
            {formatRupiah(transaction.amount)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
