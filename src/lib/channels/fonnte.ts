import type { ChannelEvent } from "../data/channel-intake";
import type { BusinessChannelInput } from "../data/business";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Pesan pelanggan tidak sesuai format");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(label + " belum sesuai");
  return value.trim();
}
function amount(value: unknown, positive = false): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < (positive ? 1 : 0) ||
    value > 2_000_000_000
  )
    throw new Error("Jumlah atau nominal belum sesuai");
  return value;
}
export function parseChannelEvent(value: unknown): ChannelEvent {
  const input = record(value);
  const rawPhone = text(input.phoneNumber, "Nomor pelanggan", 20).replace(/^\+/, "");
  if (!/^\d{8,15}$/.test(rawPhone)) throw new Error("Nomor pelanggan belum sesuai");
  const phoneNumber = rawPhone.startsWith("0") ? "62" + rawPhone.slice(1) : rawPhone;
  const event: ChannelEvent = {
    eventId: text(input.eventId, "Identitas pesan", 150),
    phoneNumber,
    body: text(input.body, "Isi pesan", 4000),
    ...(input.customerName === undefined || input.customerName === ""
      ? {}
      : { customerName: text(input.customerName, "Nama pelanggan", 100) }),
    ...(input.items === undefined
      ? {}
      : {
          items: (() => {
            if (
              !Array.isArray(input.items) ||
              input.items.length === 0 ||
              input.items.length > 50
            )
              throw new Error("Daftar pesanan belum sesuai");
            return input.items.map((value: unknown) => {
              const item = record(value);
              return {
                productId: text(item.productId, "Produk", 100),
                quantity: amount(item.quantity, true),
              };
            });
          })(),
        }),
    ...(input.payment === undefined
      ? {}
      : {
          payment: (() => {
            const payment = record(input.payment);
            if (
              payment.confidence !== undefined &&
              (typeof payment.confidence !== "number" ||
                payment.confidence < 0 ||
                payment.confidence > 1)
            )
              throw new Error("Keyakinan pembacaan belum sesuai");
            const proof = payment.proofUrl;
            if (
              proof !== undefined &&
              (typeof proof !== "string" ||
                !/^data:image\/(png|jpeg|webp);base64,/.test(proof) ||
                proof.length > 5_000_000)
            )
              throw new Error("Foto bukti belum sesuai");
            return {
              orderId: text(payment.orderId, "Orderan", 100),
              ...(payment.readAmount === undefined
                ? {}
                : { readAmount: amount(payment.readAmount) }),
              confidence: typeof payment.confidence === "number" ? payment.confidence : 0,
              ...(proof === undefined ? {} : { proofUrl: proof as string }),
            };
          })(),
        }),
  };
  if (event.items && event.payment)
    throw new Error("Kirim pesanan dan bukti pembayaran secara terpisah");
  return event;
}
export function safeChannelText(value: string): string {
  return value
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\ufe0f]/gu, "")
    .replace(/[\u002d\u2010-\u2015\u2212]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export async function readFonnteProfile(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<BusinessChannelInput> {
  if (!token.trim()) throw new Error("Token perangkat belum diisi");
  try {
    const response = await fetcher("https://api.fonnte.com/device", {
      method: "POST",
      headers: { Authorization: token },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Gagal");
    const input = record(await response.json());
    if (
      input.status !== true ||
      typeof input.device !== "string" ||
      !/^\d{8,15}$/.test(input.device) ||
      !["connect", "disconnect"].includes(String(input.device_status))
    )
      throw new Error("Gagal");
    const quota = Number(input.quota);
    return {
      status: input.device_status === "connect" ? "terhubung" : "terputus",
      phoneNumber: input.device,
      connectedAt: input.device_status === "connect" ? new Date() : null,
      packageName: "Fonnte",
      quota: Number.isSafeInteger(quota) && quota >= 0 ? quota : null,
      checkedAt: new Date(),
    };
  } catch {
    throw new Error("Koneksi WhatsApp belum dapat diperiksa");
  }
}

function fonnteTarget(value: string): string {
  const digits = value.trim().replace(/^\+/, "");
  if (!/^\d{8,15}$/.test(digits)) throw new Error("Nomor WhatsApp tujuan belum sesuai");
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits;
}

/** Nilai inbox yang boleh dikirim balik ke Fonnte. Nol dan nilai bukan angka diabaikan. */
export function fonnteInboxId(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (!/^\d+$/u.test(trimmed) || trimmed === "0") return undefined;
  return trimmed;
}

/** Kegagalan pengiriman Fonnte dengan sebab yang aman dicatat di log server. */
export class FonnteSendError extends Error {
  constructor(
    readonly status?: number,
    readonly reason?: string,
  ) {
    super("Balasan WhatsApp lewat Fonnte belum dapat dikirim");
    this.name = "FonnteSendError";
  }
}

/** Mengirim balasan melalui Fonnte sebagai jalur cadangan saat Twilio menolak kirim. */
export async function sendFonnteReply(
  token: string,
  target: string,
  text: string,
  fetcher: typeof fetch = fetch,
  inboxId?: string | number,
): Promise<void> {
  if (!token.trim()) throw new Error("Token Fonnte belum diisi");
  const to = fonnteTarget(target);
  if (!text.trim() || text.length > 4000) {
    throw new Error("Isi balasan wajib diisi dan maksimal 4000 karakter");
  }
  try {
    const body = new URLSearchParams({ target: to, message: text });
    const inbox = fonnteInboxId(inboxId);
    if (inbox !== undefined) {
      body.set("inboxid", inbox);
    }
    const response = await fetcher("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: body.toString(),
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new FonnteSendError(response.status, detail.slice(0, 300) || undefined);
    }
    const result = record(await response.json());
    if (result.status !== true && result.status !== "true") {
      const reason =
        typeof result.reason === "string"
          ? result.reason
          : typeof result.detail === "string"
            ? result.detail
            : undefined;
      throw new FonnteSendError(undefined, reason);
    }
  } catch (error) {
    if (error instanceof FonnteSendError) throw error;
    throw new FonnteSendError(
      undefined,
      error instanceof Error ? error.message : undefined,
    );
  }
}
