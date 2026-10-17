import type { Database } from "../db/client";
import { findBusiness } from "../data/business";
import {
  hasChannelEvent,
  listPendingChannelOrders,
  processChannelEvent,
  type ChannelEvent,
  type ChannelEventResult,
} from "../data/channel-intake";
import { appendMessage } from "../data/conversations";
import { listProducts } from "../data/products";
import { composeCustomerReply } from "../ai/customer-reply";
import { getAIProvider, type AIProvider } from "../ai/provider";
import { parseSaleTranscript } from "../ai/transcript";
import { parseReceipt } from "../ai/receipt";
import { transcribeAudio } from "../ai/speech";
import { safeChannelText } from "./fonnte";
import { downloadTwilioMedia, type TwilioConfig, type TwilioMessage } from "./twilio";

type IntakeOptions = {
  download?: typeof downloadTwilioMedia;
  transcribe?: typeof transcribeAudio;
  provider?: AIProvider;
};

async function finalizeReply(
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

/** T5.13, T5.14: normalisasi media sebelum memakai alur pesanan yang sama. */
export async function receiveTwilioMessage(
  db: Database,
  businessId: string,
  message: TwilioMessage,
  config: TwilioConfig,
  options: IntakeOptions = {},
): Promise<ChannelEventResult> {
  const business = await findBusiness(db, businessId);
  const sender = config.from.slice("whatsapp:+".length);
  if (
    business?.channelStatus !== "terhubung" ||
    business.channelPackage !== "Twilio Sandbox" ||
    (business.channelPhoneNumber !== null && business.channelPhoneNumber !== sender)
  ) {
    throw new Error("Hubungkan Twilio sebelum memproses pesan");
  }
  if (await hasChannelEvent(db, businessId, message.eventId)) {
    return { duplicate: true, reply: "Pesan ini sudah tercatat" };
  }
  const provider = options.provider ?? getAIProvider();
  let event: ChannelEvent = {
    eventId: message.eventId,
    phoneNumber: message.phoneNumber,
    customerName: message.customerName,
    body: safeChannelText(message.body) || "Lampiran pelanggan",
  };
  if (message.media) {
    const isAudio = message.media.contentType.startsWith("audio/");
    event = { ...event, kind: isAudio ? "voice" : "image" };
    let media: Awaited<ReturnType<typeof downloadTwilioMedia>>;
    try {
      media = await (options.download ?? downloadTwilioMedia)(message.media, config);
    } catch {
      return processChannelEvent(db, businessId, {
        ...event,
        reply: "Lampiran belum dapat diunduh. Silakan kirim ulang foto atau ketik pesan Anda.",
      });
    }
    if (isAudio) {
      try {
        const transcript = await (options.transcribe ?? transcribeAudio)(media.bytes, media.contentType);
        // Caption bukan pengganti hasil transkripsi dan tidak boleh mengubah maksud suara.
        event = { ...event, body: safeChannelText(transcript) };
      } catch {
        return processChannelEvent(db, businessId, {
          ...event,
          body: safeChannelText(message.body) || "Pesan suara belum dapat ditranskripsi",
          reply: "Pesan suara belum dapat ditranskripsi. Silakan ketik ulang pesan Anda.",
        });
      }
    } else {
      const proofUrl = `data:${media.contentType};base64,${Buffer.from(media.bytes).toString("base64")}`;
      event = { ...event, image: proofUrl, body: safeChannelText(message.body) || "Foto bukti pembayaran" };
      const pending = await listPendingChannelOrders(db, businessId, message.phoneNumber);
      // Kode tanpa tanda hubung aman ditampilkan melalui aturan teks aplikasi.
      const codes = message.body.toLowerCase().match(/\b(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\b/g) ?? []; // lint-ui-ignore: pola kode pesanan, bukan teks antarmuka
      const selected = codes.length
        ? pending.filter(order => codes.some(code => code.replaceAll("-", "") === order.id.replaceAll("-", ""))) // lint-ui-ignore: pemisah kode pesanan, bukan teks antarmuka
        : pending;
      if (selected.length !== 1) {
        return processChannelEvent(db, businessId, {
          ...event,
          reply: pending.length
            ? "Ada beberapa pesanan atau kode belum sesuai. Kirim ulang foto beserta kode pesanan pada caption."
            : "Foto sudah diterima. Belum ada pesanan terbuka untuk nomor ini. Kirim pesanan terlebih dahulu.",
        });
      }
      const reading = await parseReceipt(proofUrl, provider);
      return processChannelEvent(db, businessId, {
        ...event,
        payment: {
          orderId: selected[0].id,
          proofUrl,
          confidence: reading.ok ? reading.receipt.confidence : 0,
          ...(reading.ok ? { readAmount: reading.receipt.amount } : {}),
        },
      });
    }
  }
  const parsed = await parseSaleTranscript(event.body, await listProducts(db, businessId), provider);
  if (parsed.ok && parsed.items.length && parsed.unmatched.length === 0) {
    event = { ...event, items: parsed.items };
  } else if (!parsed.ok || parsed.unmatched.length) {
    event = { ...event, reply: "Pesan sudah tercatat tetapi pesanan belum dapat dipahami. Ketik nama produk dan jumlah dengan jelas." };
  }
  const result = await processChannelEvent(db, businessId, event, { appendReply: false });
  return finalizeReply(db, businessId, event, result, provider);
}
