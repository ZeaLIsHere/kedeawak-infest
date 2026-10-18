import { ShoppingBag } from "lucide-react";

import { SectionCard } from "@/components/shell/section-card";
import { StateBlock } from "@/components/shell/state-block";
import { ConfirmOrder } from "@/components/whatsapp/confirm-order";
import { safeChannelText } from "@/lib/channels/fonnte";
import { formatRupiah } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";

export type WhatsAppOrderItem = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
};

export type WhatsAppOrder = {
  readonly id: string;
  readonly customerName: string;
  readonly phone: string | null;
  readonly createdAt: Date;
  readonly total: number;
  readonly status: "baru" | "dikonfirmasi" | "selesai";
  readonly items: readonly WhatsAppOrderItem[];
  readonly paymentStatus: "menunggu" | "cocok" | "tidak_cocok" | null;
  readonly origin: string;
};

const ORDER_STATUS_LABEL: Record<WhatsAppOrder["status"], string> = {
  baru: "Pesanan baru",
  dikonfirmasi: "Sudah dikonfirmasi",
  selesai: "Sudah selesai",
};

const PAYMENT_STATUS_LABEL: Record<"menunggu" | "cocok" | "tidak_cocok", string> = {
  menunggu: "Bukti menunggu diperiksa",
  cocok: "Bukti cocok",
  tidak_cocok: "Bukti belum cocok",
};

function displayPhone(phone: string | null): string {
  if (phone === null) return "Nomor pelanggan tidak tersedia";
  const digits = phone.replace(/\D/gu, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;

  return `+${normalized}`;
}

/**
 * Daftar pesanan yang tercatat dari pesan pelanggan lewat WhatsApp.
 *
 * Balasan agen tidak ditampilkan, mengikuti aturan bagian 11.2 butir 5. Yang
 * dilihat pemilik warung cukup pesanan, rincian item, dan keadaan pembayaran.
 */
export function WhatsAppOrderList({
  orders,
}: {
  readonly orders: readonly WhatsAppOrder[];
}) {
  return (
    <SectionCard
      title="Pesanan dari WhatsApp"
      description="Pesanan yang tercatat dari pesan pelanggan lewat perangkat Fonnte."
    >
      {orders.length === 0 ? (
        <StateBlock
          icon={ShoppingBag}
          title="Belum ada pesanan WhatsApp"
          description="Pesanan muncul di sini setelah pelanggan menyebut nama produk dan jumlah lewat WhatsApp."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold">
                    {safeChannelText(order.customerName)}
                  </p>
                  <p className="text-caption tabular-nums text-muted-foreground">
                    {displayPhone(order.phone)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatRupiah(order.total)}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {formatDateTime(order.createdAt)} WIB
                  </p>
                </div>
              </div>

              {order.items.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Rincian item belum tercatat.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 break-words">
                        {formatNumber(item.quantity)} {safeChannelText(item.name)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatRupiah(item.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md border border-border px-2 py-1 text-caption text-muted-foreground">
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
                {order.paymentStatus === null ? null : (
                  <span className="rounded-md border border-border px-2 py-1 text-caption text-muted-foreground">
                    {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                  </span>
                )}
              </div>

              {order.status === "baru" ? <ConfirmOrder orderId={order.id} /> : null}

              <p className="mt-3 text-sm text-muted-foreground">
                Pesan pelanggan: {safeChannelText(order.origin)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
