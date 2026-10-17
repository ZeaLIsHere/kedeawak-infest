import type { Database } from "../db/client";
import { findBusiness } from "../data/business";
import { listProducts } from "../data/products";
import { processChannelEvent, type ChannelEventResult } from "../data/channel-intake";
import { parseSaleTranscript } from "../ai/transcript";
import { parseReceipt } from "../ai/receipt";
import { parseChannelEvent, safeChannelText } from "./fonnte";

export async function receiveChannelEvent(db:Database,businessId:string,payload:unknown,source:"simulasi"|"fonnte",allowOrders=true):Promise<ChannelEventResult> {
  const business=await findBusiness(db,businessId);
  if (business?.channelStatus !== "terhubung") throw new Error("Hubungkan kanal sebelum mengirim pesan");
  const event=parseChannelEvent(payload);
  if (source === "fonnte" && event.payment?.readAmount !== undefined) throw new Error("Nominal pembayaran harus dibaca dari bukti");
  let prepared=event;
  if (event.payment?.proofUrl && event.payment.readAmount === undefined) {
    const result=await parseReceipt(event.payment.proofUrl);
    if (result.ok) prepared={...event,payment:{...event.payment,readAmount:result.receipt.amount,confidence:result.receipt.confidence}};
  }
  if (allowOrders && !prepared.items && !prepared.payment && /\b(pesan|beli|mau|order)\b/i.test(prepared.body)) {
    const result=await parseSaleTranscript(prepared.body,await listProducts(db,businessId));
    if (result.ok && result.items.length && result.unmatched.length===0) prepared={...prepared,items:result.items};
  }
  const result=await processChannelEvent(db,businessId,prepared);
  return {...result,reply:safeChannelText(result.reply)};
}
