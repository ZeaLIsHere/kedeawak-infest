import { Suspense } from "react";
import { connection } from "next/server";

import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";
import { ConnectionPanel } from "@/components/whatsapp/connection-panel";
import { WhatsAppOrderList, type WhatsAppOrder } from "@/components/whatsapp/order-list";
import { findBusiness } from "@/lib/data/business";
import { getChannelOverview } from "@/lib/data/channel-intake";
import { withCurrentBusiness } from "@/lib/data/server";

async function OrderContent() {
  await connection();

  const data = await withCurrentBusiness(async (db, businessId) => {
    const [business, overview] = await Promise.all([
      findBusiness(db, businessId),
      getChannelOverview(db, businessId),
    ]);

    return { business, overview };
  });

  if (!data?.business) return <NoWarungState />;

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
