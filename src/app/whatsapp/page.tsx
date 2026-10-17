import { Suspense } from "react";
import { connection } from "next/server";

import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { PageHeader } from "@/components/shell/page-header";
import { WhatsAppOrderList, type WhatsAppOrder } from "@/components/whatsapp/order-list";
import { getChannelOverview } from "@/lib/data/channel-intake";
import { withCurrentBusiness } from "@/lib/data/server";

async function OrderContent() {
  await connection();

  const overview = await withCurrentBusiness((db, businessId) =>
    getChannelOverview(db, businessId),
  );

  if (overview === undefined) return <NoWarungState />;

  const orders: WhatsAppOrder[] = overview.orders.map((order) => ({
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

  return <WhatsAppOrderList orders={orders} />;
}

export default function WhatsappPage() {
  return (
    <>
      <PageHeader
        title="Integrasi WhatsApp"
        description="Daftar pesanan yang masuk lewat WhatsApp."
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
