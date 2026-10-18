import { Badge } from "@/components/ui/badge";
import { BuyGoldButton } from "@/components/settings/subscription-actions";
import {
  FREE_WHATSAPP_ORDER_LIMIT,
  GOLD_DURATION_DAYS,
  GOLD_PRICE,
  type SubscriptionStatus,
} from "@/lib/data/subscription";
import { formatRupiah } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";

/**
 * Perbandingan paket Free dan Gold beserta pemakaian pesanan WhatsApp hari ini.
 * Harga dan batas diambil dari lapisan data, bukan ditulis ulang di komponen.
 */
export function SubscriptionPanel({ status }: { readonly status: SubscriptionStatus }) {
  const used = status.whatsappOrdersToday;
  const limit = status.whatsappOrderLimit ?? FREE_WHATSAPP_ORDER_LIMIT;
  const width = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="flex flex-col gap-gutter">
      <div className="grid gap-gutter md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-md border-2 border-border bg-card p-4 shadow-control">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body font-bold">Free</h3>
            {!status.active && <Badge variant="secondary">Paket aktif</Badge>}
          </div>
          <p className="text-metric font-bold tabular-nums">{formatRupiah(0)}</p>
          <ul className="list-disc space-y-1 pl-5 text-body font-medium">
            <li>{formatNumber(FREE_WHATSAPP_ORDER_LIMIT)} pesanan WhatsApp per hari</li>
            <li>Tanpa fitur suara dan foto struk</li>
          </ul>
          <div className="mt-auto rounded-md border-2 border-border bg-muted p-3">
            <p className="text-caption font-bold">Pesanan WhatsApp hari ini</p>
            <p className="text-body font-bold tabular-nums">
              {formatNumber(used)} dari {formatNumber(limit)}
            </p>
            <div
              aria-hidden="true"
              className="mt-2 h-3 overflow-hidden rounded-full border-2 border-border bg-card"
            >
              <div className="h-full bg-primary" style={{ width: `${width}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border-2 border-border bg-profit-surface p-4 text-foreground shadow-control">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body font-bold">Gold</h3>
            {status.active && <Badge variant="secondary">Paket aktif</Badge>}
          </div>
          <p className="text-metric font-bold tabular-nums">
            {formatRupiah(GOLD_PRICE)}
            <span className="text-body font-medium"> per bulan</span>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-body font-medium">
            <li>Pesanan WhatsApp tanpa batas</li>
            <li>Fitur suara dan foto struk di Agen AI</li>
            <li>Berlaku {formatNumber(GOLD_DURATION_DAYS)} hari</li>
          </ul>
          <div className="mt-auto">
            {status.active ? (
              <p className="text-body font-bold">
                Berlaku sampai{" "}
                {status.expiresAt ? formatDate(status.expiresAt) : "30 hari"}
              </p>
            ) : (
              <BuyGoldButton />
            )}
          </div>
        </div>
      </div>

      <p className="text-caption font-medium text-muted-foreground">
        Pembayaran pada demo ini hanya berupa konfirmasi, belum memproses uang.
      </p>
    </div>
  );
}
