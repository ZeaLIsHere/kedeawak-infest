import type { Database } from "../db/client";
import { composeCustomerReply } from "../ai/customer-reply";
import type { AIProvider } from "../ai/provider";
import { appendMessage } from "../data/conversations";
import type { ChannelEvent, ChannelEventResult } from "../data/channel-intake";
import { safeChannelText } from "./fonnte";

/**
 * Menambahkan balasan agen ke percakapan.
 *
 * Pesanan dan pembayaran memakai balasan pasti dari alur data. Pertanyaan biasa
 * memakai balasan DeepSeek dari konteks warung. Balasan tetap disimpan sebagai
 * riwayat walaupun halaman WhatsApp tidak menampilkannya.
 */
export async function finalizeChannelReply(
  db: Database,
  businessId: string,
  event: ChannelEvent,
  result: ChannelEventResult,
  provider: AIProvider | undefined,
): Promise<ChannelEventResult> {
  if (result.duplicate || result.conversationId === undefined) {
    return { ...result, reply: safeChannelText(result.reply) };
  }

  let reply = result.reply;
  if (result.orderId === undefined && result.paymentStatus === undefined) {
    const aiReply = await composeCustomerReply(
      db,
      businessId,
      result.conversationId,
      event.body,
      provider,
    );
    if (aiReply !== undefined) reply = aiReply;
  }

  const text = safeChannelText(reply);
  if (text) {
    await appendMessage(db, businessId, result.conversationId, {
      sender: "agent",
      kind: "text",
      body: text,
    });
  }

  return { ...result, reply: text };
}
