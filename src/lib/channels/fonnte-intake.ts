import type { Database } from "../db/client";
import { getAIProvider, type AIProvider } from "../ai/provider";
import { parseSaleTranscript } from "../ai/transcript";
import { findBusiness } from "../data/business";
import {
  hasChannelEvent,
  processChannelEvent,
  type ChannelEvent,
  type ChannelEventResult,
} from "../data/channel-intake";
import { listProducts } from "../data/products";
import { finalizeChannelReply } from "./finalize-reply";
import { safeChannelText } from "./fonnte";

export type FonnteInbound = {
  readonly eventId: string;
  readonly deviceNumber: string;
  readonly phoneNumber: string;
  readonly customerName?: string;
  readonly body: string;
  readonly kind?: "text" | "voice" | "image";
  readonly mediaUrl?: string;
  readonly inboxId?: string;
};

type IntakeOptions = {
  provider?: AIProvider;
};

/**
 * Memproses pesan masuk dari webhook Fonnte.
 *
 * Pesan teks memakai alur pesanan dan balasan AI yang sama dengan Twilio.
 * Lampiran hanya dicatat sebagai pesan pelanggan; pemrosesan media bergantung
 * pada paket Fonnte yang mengirim URL lampiran.
 */
export async function receiveFonnteMessage(
  db: Database,
  businessId: string,
  message: FonnteInbound,
  options: IntakeOptions = {},
): Promise<ChannelEventResult> {
  const business = await findBusiness(db, businessId);
  if (
    business?.channelStatus !== "terhubung" ||
    business.channelPackage !== "Fonnte" ||
    (business.channelPhoneNumber !== null &&
      business.channelPhoneNumber !== message.deviceNumber)
  ) {
    throw new Error("Hubungkan Fonnte sebelum memproses pesan");
  }
  if (await hasChannelEvent(db, businessId, message.eventId)) {
    return { duplicate: true, reply: "Pesan ini sudah tercatat" };
  }

  const provider = options.provider ?? getAIProvider();
  const body = safeChannelText(message.body) || "Lampiran pelanggan";

  if (message.kind === "voice" || message.kind === "image") {
    const event: ChannelEvent = {
      eventId: message.eventId,
      phoneNumber: message.phoneNumber,
      customerName: message.customerName,
      body,
      kind: message.kind,
      ...(message.mediaUrl === undefined ? {} : { image: message.mediaUrl }),
      reply:
        message.kind === "image"
          ? "Foto sudah diterima. Untuk pesanan, ketik nama produk dan jumlah."
          : "Pesan suara sudah diterima. Ketik nama produk dan jumlah agar pesanan dapat dicatat.",
    };

    return processChannelEvent(db, businessId, event);
  }

  let event: ChannelEvent = {
    eventId: message.eventId,
    phoneNumber: message.phoneNumber,
    customerName: message.customerName,
    body,
  };
  const parsed = await parseSaleTranscript(
    event.body,
    await listProducts(db, businessId),
    provider,
  );
  if (parsed.ok && parsed.items.length && parsed.unmatched.length === 0) {
    event = { ...event, items: parsed.items };
  } else if (!parsed.ok || parsed.unmatched.length) {
    event = {
      ...event,
      reply:
        "Pesan sudah tercatat tetapi pesanan belum dapat dipahami. Ketik nama produk dan jumlah dengan jelas.",
    };
  }

  const result = await processChannelEvent(db, businessId, event, {
    appendReply: false,
  });
  return finalizeChannelReply(db, businessId, event, result, provider);
}
