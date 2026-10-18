import { Suspense } from "react";
import { connection } from "next/server";

import { ConversationPanel } from "@/components/conversation/conversation-panel";
import { PageHeader } from "@/components/shell/page-header";
import type { Receipt } from "@/lib/ai/receipt";
import { getOwnerConversation } from "@/lib/data/agent-context";
import { findLatestSession } from "@/lib/data/agent-sessions";
import { listMessages } from "@/lib/data/conversations";
import { withCurrentBusiness } from "@/lib/data/server";
import { readSubscription } from "@/lib/data/subscription";

async function Conversation() {
  await connection();

  const data = await withCurrentBusiness(async (db, id) => {
    const conversation = await getOwnerConversation(db, id);
    const [messages, session, subscription] = await Promise.all([
      listMessages(db, id, conversation.id),
      findLatestSession(db, id, conversation.id),
      readSubscription(db, id),
    ]);

    return {
      messages: messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        body: message.body ?? "",
        createdAt: message.createdAt.toISOString(),
      })),
      context: session?.context,
      goldFeatures: subscription?.active ?? false,
    };
  });

  if (!data) {
    return (
      <p className="text-muted-foreground">
        Data warung belum tersedia. Siapkan data warung terlebih dahulu.
      </p>
    );
  }

  const context =
    typeof data.context === "object" && data.context !== null
      ? (data.context as { pendingReceipt?: Receipt })
      : {};

  return (
    <ConversationPanel
      initialMessages={data.messages}
      available={Boolean(process.env.DEEPSEEK_API_KEY?.trim())}
      goldFeatures={data.goldFeatures}
      initialReceipt={context.pendingReceipt}
    />
  );
}

export default function PercakapanPage() {
  return (
    <>
      <PageHeader
        title="Percakapan dengan Agen AI"
        description="Tanya keadaan warung dan catat transaksi melalui percakapan."
      />
      <div className="mx-auto w-full max-w-content p-page">
        <Suspense
          fallback={
            <p role="status" className="text-muted-foreground">
              Memuat percakapan warung...
            </p>
          }
        >
          <Conversation />
        </Suspense>
      </div>
    </>
  );
}
