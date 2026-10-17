import { Suspense } from "react";
import { connection } from "next/server";

import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { PageHeader } from "@/components/shell/page-header";
import { WhatsAppInbox, type InboxConversation, type InboxMessage } from "@/components/whatsapp/inbox";
import { ConnectionPanel } from "@/components/whatsapp/connection-panel";
import { CustomerControls } from "@/components/whatsapp/customer-controls";
import { MessageSimulator } from "@/components/whatsapp/message-simulator";
import { safeChannelText } from "@/lib/channels/fonnte";
import { getChannelOverview } from "@/lib/data/channel-intake";
import { listMessages, listWhatsAppConversations } from "@/lib/data/conversations";
import { findBusiness } from "@/lib/data/business";
import { listCustomers, readCustomerName, readCustomerPhone } from "@/lib/data/customers";
import { listProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";

async function ChannelContent({
  searchParams,
}: Pick<PageProps<"/whatsapp">, "searchParams">) {
  const params = await searchParams;

  await connection();

  const requested = typeof params.percakapan === "string" ? params.percakapan : undefined;
  const data = await withCurrentBusiness(async (db, id) => {
    const [business, products, inbox, overview, customers] = await Promise.all([
      findBusiness(db, id),
      listProducts(db, id),
      listWhatsAppConversations(db, id),
      getChannelOverview(db, id),
      listCustomers(db, id),
    ]);
    const selected = inbox.find((conversation) => conversation.id === requested) ?? inbox[0];
    const selectedMessages =
      selected === undefined
        ? []
        : (await listMessages(db, id, selected.id)).filter(
            (message) => message.sender === "customer",
          );

    return {
      business,
      products,
      inbox,
      overview,
      customers,
      selectedId: selected?.id,
      messages: selectedMessages,
    };
  });

  if (!data?.business) return <NoWarungState />;

  const connected = data.business.channelStatus === "terhubung";
  const simulation = data.business.channelPackage === "Simulasi web";
  const channelLabel = simulation
    ? "Simulasi web"
    : connected && data.business.channelPackage === "Twilio Sandbox"
      ? "WhatsApp Sandbox"
      : "Belum terhubung";

  const conversations: InboxConversation[] = data.inbox.map((conversation) => {
    const last = conversation.lastCustomerMessage;
    return {
      id: conversation.id,
      name: safeChannelText(conversation.customerName),
      phone: conversation.phone,
      preview:
        last === undefined
          ? "Belum ada pesan"
          : last.kind === "voice"
            ? "Pesan suara"
            : last.kind === "image"
              ? "Foto"
              : safeChannelText(last.body ?? "Pesan pelanggan"),
      previewKind: last?.kind ?? "text",
      lastMessageAt: last?.createdAt ?? null,
    };
  });
  const selected = conversations.find(
    (conversation) => conversation.id === data.selectedId,
  );
  const messages: InboxMessage[] = data.messages.map((message) => ({
    id: message.id,
    kind: message.kind,
    body: safeChannelText(message.body ?? ""),
    createdAt: message.createdAt,
  }));

  return (
    <>
      <WhatsAppInbox
        conversations={conversations}
        selected={selected}
        messages={messages}
        channelLabel={channelLabel}
        connected={connected}
        simulation={simulation}
      />

      <details
        id="pengaturan"
        className="mt-4 rounded-xl border border-border bg-card shadow-card"
      >
        <summary className="cursor-pointer px-5 py-4 font-medium">
          Pengaturan koneksi, simulasi, dan data pelanggan
        </summary>
        <div className="grid gap-6 border-t border-border p-5 lg:grid-cols-2">
          <section>
            <h2 className="text-section-title font-semibold">Koneksi nomor</h2>
            <div className="mt-3">
              <ConnectionPanel
                connected={connected}
                simulation={simulation}
                phone={data.business.channelPhoneNumber}
              />
            </div>
          </section>
          <section>
            <h2 className="text-section-title font-semibold">Data pelanggan</h2>
            <div className="mt-3">
              <CustomerControls
                customers={data.customers.map((customer) => ({
                  id: customer.id,
                  name: safeChannelText(readCustomerName(customer) ?? "Pelanggan warung"),
                  phone: readCustomerPhone(customer),
                }))}
              />
            </div>
          </section>
          <section className="lg:col-span-2">
            <h2 className="text-section-title font-semibold">Panel pelanggan</h2>
            <div className="mt-3">
              <MessageSimulator
                connected={connected}
                products={data.products.map((product) => ({
                  id: product.id,
                  name: safeChannelText(product.name),
                  stock: product.stock,
                }))}
                orders={data.overview.orders.map((order) => ({
                  id: order.id,
                  phone: order.phone,
                  customerName: order.customerName,
                  total: order.total,
                }))}
              />
            </div>
          </section>
        </div>
      </details>
    </>
  );
}

export default function WhatsappPage(props: PageProps<"/whatsapp">) {
  return (
    <>
      <PageHeader
        title="Integrasi WhatsApp"
        description="Percakapan pelanggan dari WhatsApp dan rincian pesan yang masuk."
      />
      <div className="mx-auto w-full max-w-content p-page">
        <CardError title="Integrasi WhatsApp">
          <Suspense
            fallback={
              <p role="status" className="text-sm text-muted-foreground">
                Memuat percakapan WhatsApp
              </p>
            }
          >
            <ChannelContent searchParams={props.searchParams} />
          </Suspense>
        </CardError>
      </div>
    </>
  );
}
