import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";
import { Button } from "@/components/ui/button";
import { ConnectionPanel } from "@/components/whatsapp/connection-panel";
import { RefreshOrdersButton } from "@/components/whatsapp/refresh-orders-button";
import { WhatsAppOrderList, type WhatsAppOrder } from "@/components/whatsapp/order-list";
import { findBusiness } from "@/lib/data/business";
import { getChannelOverview } from "@/lib/data/channel-intake";
import { withCurrentBusiness } from "@/lib/data/server";
import { readSubscription } from "@/lib/data/subscription";
import { formatDate } from "@/lib/format/date";
import { formatNumber } from "@/lib/format/number";

async function OrderContent() {
  await connection();

  const data = await withCurrentBusiness(async (db, businessId) => {
    const [business, overview, subscription] = await Promise.all([
      findBusiness(db, businessId),
      getChannelOverview(db, businessId),
      readSubscription(db, businessId),
    ]);

    return { business, overview, subscription };
  });

  if (!data?.business || !data.subscription) return <NoWarungState />;
  const subscription = data.subscription;

  const orders: WhatsAppOrder[] = data.overview.orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    createdAt: order.createdAt,
    total: order.total,
    status: order.status,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    paymentStatus: order.payments.at(-1)?.status ?? null,
    origin: order.origin,
  }));

  return (
    <div className="flex flex-col gap-section">
      <SectionCard
        title="Koneksi WhatsApp"
        description="Hubungkan perangkat Fonnte agar pesanan pelanggan masuk ke aplikasi."
      >
        <ConnectionPanel
          state={{
            connected:
              data.business.channelStatus === "terhubung" &&
              data.business.channelPackage === "Fonnte",
            phone: data.business.channelPhoneNumber,
            packageName: data.business.channelPackage,
            quota: data.business.channelQuota,
            tokenConfigured: Boolean(process.env.FONNTE_TOKEN?.trim()),
            webhookConfigured: Boolean(process.env.FONNTE_WEBHOOK_SECRET?.trim()),
          }}
        />
      </SectionCard>

      <div className="rounded-md border-2 border-border bg-card p-4 shadow-control">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body font-bold">
              {subscription.active ? "Paket Gold aktif" : "Paket Free"}
            </p>
            <p className="text-body font-medium text-muted-foreground">
              {subscription.active
                ? `Pesanan WhatsApp tanpa batas. Berlaku sampai ${
                    subscription.expiresAt
                      ? formatDate(subscription.expiresAt)
                      : "30 hari"
                  }.`
                : `Pesanan WhatsApp hari ini ${formatNumber(
                    subscription.whatsappOrdersToday,
                  )} dari ${formatNumber(
                    subscription.whatsappOrderLimit ?? 0,
                  )}. Sisa ${formatNumber(
                    subscription.whatsappOrdersRemaining ?? 0,
                  )} pesanan.`}
            </p>
          </div>
          {subscription.active ? null : (
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/pengaturan">Aktifkan Gold</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <RefreshOrdersButton />
      </div>

      <WhatsAppOrderList orders={orders} />
    </div>
  );
}

export default function WhatsappPage() {
  return (
    <>
      <PageHeader
        title="Integrasi WhatsApp"
        description="Pesanan yang masuk lewat WhatsApp toko."
      />
      <div className="mx-auto w-full max-w-content p-page">
        <CardError title="Integrasi WhatsApp">
          <Suspense
            fallback={
              <p role="status" className="text-sm text-muted-foreground">
                Memuat pesanan WhatsApp
              </p>
            }
          >
            <OrderContent />
          </Suspense>
        </CardError>
      </div>
    </>
  );
}
