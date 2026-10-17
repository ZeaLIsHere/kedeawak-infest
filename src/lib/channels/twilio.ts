import twilio from "twilio";

import type { BusinessChannelInput } from "../data/business";

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  webhookUrl: string;
};

export type TwilioMessage = {
  eventId: string;
  phoneNumber: string;
  customerName?: string;
  body: string;
  media?: { url: string; contentType: string };
};

type TwilioMedia = NonNullable<TwilioMessage["media"]>;

const ACCOUNT_SID = /^AC[\da-fA-F]{32}$/;
const MESSAGE_SID = /^(?:SM|MM)[\da-fA-F]{32}$/;
const WHATSAPP_NUMBER = /^whatsapp:\+[1-9]\d{1,14}$/;
const TIMEOUT_MS = 12_000;
const CONTENT_TYPE = "Content-Type"; // lint-ui-ignore: nama header HTTP resmi
const CONTENT_LENGTH = "Content-Length"; // lint-ui-ignore: nama header HTTP resmi
const OCTET_STREAM = "application/octet-stream"; // lint-ui-ignore: MIME biner resmi
const ACCOUNTS_URL = "https://api.twilio.com/2010-04-01/Accounts"; // lint-ui-ignore: URL API resmi Twilio
const IMAGE_LIMIT = 3 * 1024 * 1024;
const AUDIO_LIMIT = 16 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav", // lint-ui-ignore: MIME resmi audio WAV
  "audio/webm",
  "audio/flac",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class TwilioInputError extends Error {}

function invalid(message: string): never {
  throw new TwilioInputError(message);
}

function secureUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid("Alamat layanan Twilio belum sesuai");
  }
  if (
    !value.startsWith("https://") ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    value.includes("#") ||
    /[\\\s\u0000-\u001f\u007f]/.test(value)
  )
    invalid("Alamat layanan Twilio belum sesuai");
  return url;
}

function checkConfig(config: TwilioConfig): TwilioConfig {
  if (!ACCOUNT_SID.test(config.accountSid)) invalid("Identitas akun Twilio belum sesuai");
  if (!config.authToken.trim()) invalid("Token autentikasi Twilio belum diisi");
  if (!WHATSAPP_NUMBER.test(config.from)) invalid("Nomor WhatsApp Sandbox belum sesuai");
  const webhook = secureUrl(config.webhookUrl);
  if (webhook.pathname !== "/api/channels/whatsapp")
    invalid("Alamat webhook WhatsApp belum sesuai");
  return config;
}

export function getTwilioConfig(): TwilioConfig {
  return checkConfig({
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    from: process.env.TWILIO_WHATSAPP_FROM ?? "",
    webhookUrl: process.env.WEBHOOK_URL ?? "",
  });
}

export function validateTwilioSignature(
  config: TwilioConfig,
  signature: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  try {
    // URL harus persis konfigurasi, bukan direkonstruksi dari header proxy.
    return twilio.validateRequest(config.authToken, signature, config.webhookUrl, params);
  } catch {
    return false;
  }
}

function normalizeMime(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

function declaredMime(value: string): string {
  const contentType = normalizeMime(value);
  if (!MEDIA_TYPES.has(contentType)) {
    invalid(
      "Format lampiran belum didukung. Kirim foto JPEG, PNG, WebP atau rekaman suara",
    );
  }
  return contentType;
}

function initialMediaUrl(value: string, config: TwilioConfig): URL {
  const url = secureUrl(value);
  const prefix = `/2010-04-01/Accounts/${config.accountSid}/Messages/`; // lint-ui-ignore: jalur API resmi Twilio
  const suffix = url.pathname.slice(prefix.length);
  if (
    url.hostname !== "api.twilio.com" ||
    url.search ||
    value.includes("?") ||
    value !== url.href ||
    !url.pathname.startsWith(prefix) ||
    !/^(?:SM|MM)[\da-fA-F]{32}\/Media\/ME[\da-fA-F]{32}$/.test(suffix)
  )
    invalid("Alamat lampiran Twilio belum sesuai");
  return url;
}

export function parseTwilioMessage(
  params: Record<string, string>,
  config: TwilioConfig,
): TwilioMessage {
  checkConfig(config);
  if (params.AccountSid !== config.accountSid)
    invalid("Akun pengirim pesan tidak sesuai");
  if (params.To !== config.from) invalid("Nomor tujuan pesan tidak sesuai");
  if (!WHATSAPP_NUMBER.test(params.From ?? ""))
    invalid("Nomor WhatsApp pelanggan belum sesuai");
  if (!MESSAGE_SID.test(params.MessageSid ?? ""))
    invalid("Identitas pesan Twilio belum sesuai");
  if (typeof params.Body !== "string" || params.Body.length > 4000)
    invalid("Isi pesan maksimal 4000 karakter");
  if (params.NumMedia !== "0" && params.NumMedia !== "1")
    invalid("Kirim paling banyak satu lampiran dalam satu pesan");
  if (params.NumMedia === "0" && !params.Body.trim())
    invalid("Isi pesan atau lampiran belum diisi");
  const customerName = params.ProfileName?.trim();
  if (customerName && customerName.length > 100)
    invalid("Nama pelanggan maksimal 100 karakter");
  let media: TwilioMedia | undefined;
  if (params.NumMedia === "1") {
    if (!params.MediaUrl0 || !params.MediaContentType0)
      invalid("Lampiran pesan belum lengkap");
    initialMediaUrl(params.MediaUrl0, config);
    media = {
      url: params.MediaUrl0,
      contentType: declaredMime(params.MediaContentType0),
    };
  }
  return {
    eventId: params.MessageSid,
    phoneNumber: params.From.slice("whatsapp:+".length),
    ...(customerName ? { customerName } : {}),
    body: params.Body,
    ...(media ? { media } : {}),
  };
}

function basicAuth(config: TwilioConfig): string {
  return (
    "Basic " + Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")
  );
}

function redirectMediaUrl(location: string, previous: URL): URL {
  let resolved: string;
  try {
    resolved = new URL(location, previous).href;
  } catch {
    return invalid("Alamat pengalihan lampiran belum sesuai");
  }
  if (/[\\\s\u0000-\u001f\u007f]/.test(location) || location.includes("#")) {
    invalid("Alamat pengalihan lampiran belum sesuai");
  }
  const url = secureUrl(resolved);
  const host = url.hostname;
  if (
    host !== "media.twiliocdn.com" &&
    !host.endsWith(".twilio.com") &&
    !host.endsWith(".twiliocdn.com")
  )
    invalid("Tujuan pengalihan lampiran tidak diizinkan");
  return url;
}

async function withTimeout<T>(
  message: string,
  operation: (signal: AbortSignal, aborted: Promise<never>) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Waktu permintaan habis"));
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation(controller.signal, aborted), aborted]);
  } catch (error) {
    if (error instanceof TwilioInputError) throw error;
    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }
}

function matchesMagic(bytes: Uint8Array, contentType: string): boolean {
  const ascii = (offset: number, text: string) =>
    bytes.length >= offset + text.length &&
    [...text].every(
      (character, index) => bytes[offset + index] === character.charCodeAt(0),
    );
  switch (contentType) {
    case "image/png":
      return (
        bytes.length >= 8 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
      );
    case "image/jpeg":
      return (
        bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      );
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "audio/ogg":
      return ascii(0, "OggS");
    case "audio/mpeg":
      return (
        ascii(0, "ID3") ||
        (bytes.length >= 2 &&
          bytes[0] === 255 &&
          (bytes[1] & 0xe0) === 0xe0 &&
          (bytes[1] & 0x06) !== 0)
      );
    case "audio/mp4":
      return bytes.length >= 12 && ascii(4, "ftyp");
    case "audio/wav":
    case "audio/x-wav": // lint-ui-ignore: MIME resmi audio WAV
      return ascii(0, "RIFF") && ascii(8, "WAVE");
    case "audio/webm":
      return (
        bytes.length >= 4 &&
        [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value)
      );
    case "audio/flac":
      return ascii(0, "fLaC");

    default:
      return false;
  }
}

async function readMediaBytes(
  response: Response,
  limit: number,
  aborted: Promise<never>,
): Promise<Uint8Array> {
  const length = response.headers.get(CONTENT_LENGTH);
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) {
    void response.body?.cancel().catch(() => {});
    invalid("Ukuran lampiran terlalu besar");
  }
  if (!response.body) invalid("Lampiran WhatsApp kosong");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > limit) invalid("Ukuran lampiran terlalu besar");
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (size === 0) invalid("Lampiran WhatsApp kosong");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function downloadTwilioMedia(
  media: TwilioMedia,
  config: TwilioConfig,
  fetcher: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  checkConfig(config);
  let url = initialMediaUrl(media.url, config);
  const contentType = declaredMime(media.contentType);
  return withTimeout("Lampiran WhatsApp belum dapat diunduh", async (signal, aborted) => {
    for (let redirects = 0; ; redirects++) {
      signal.throwIfAborted();
      const response = await Promise.race([
        fetcher(url.href, {
          headers: redirects === 0 ? { Authorization: basicAuth(config) } : {},
          redirect: "manual",
          signal,
        }),
        aborted,
      ]);
      if (REDIRECT_STATUSES.has(response.status)) {
        void response.body?.cancel().catch(() => {});
        if (redirects >= 3) invalid("Pengalihan lampiran terlalu banyak");
        const location = response.headers.get("Location");
        if (!location) invalid("Alamat pengalihan lampiran belum tersedia");
        url = redirectMediaUrl(location, url);
        continue;
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        invalid("Lampiran WhatsApp belum dapat diunduh");
      }
      const actualMime = normalizeMime(response.headers.get(CONTENT_TYPE) ?? "");
      if (actualMime !== contentType && actualMime !== OCTET_STREAM) {
        void response.body?.cancel().catch(() => {});
        invalid("Format lampiran tidak sesuai dengan pesan WhatsApp");
      }
      const bytes = await readMediaBytes(
        response,
        contentType.startsWith("image/") ? IMAGE_LIMIT : AUDIO_LIMIT,
        aborted,
      );
      if (actualMime === OCTET_STREAM && !matchesMagic(bytes, contentType)) {
        invalid("Format lampiran tidak sesuai dengan pesan WhatsApp");
      }
      return { bytes, contentType };
    }
  });
}

export async function sendTwilioReply(
  config: TwilioConfig,
  to: string,
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  checkConfig(config);
  if (!/^[1-9]\d{1,14}$/.test(to)) invalid("Nomor WhatsApp tujuan belum sesuai");
  if (!text.trim() || text.length > 1600) {
    invalid("Isi balasan wajib diisi dan maksimal 1600 karakter");
  }
  return withTimeout("Balasan WhatsApp belum dapat dikirim", async (signal, aborted) => {
    const response = await Promise.race([
      fetcher(`${ACCOUNTS_URL}/${config.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(config),
          [CONTENT_TYPE]: "application/x-www-form-urlencoded", // lint-ui-ignore: MIME resmi formulir HTTP
        },
        body: new URLSearchParams({
          From: config.from,
          To: "whatsapp:+" + to,
          Body: text,
        }).toString(),
        redirect: "error",
        signal,
      }),
      aborted,
    ]);
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      invalid("Balasan WhatsApp belum dapat dikirim");
    }
    const message: unknown = await Promise.race([response.json(), aborted]);
    if (
      typeof message !== "object" ||
      message === null ||
      !("sid" in message) ||
      typeof message.sid !== "string" ||
      !MESSAGE_SID.test(message.sid)
    )
      invalid("Balasan WhatsApp belum dapat dikirim");
  });
}

export function twimlReply(text?: string): string {
  const response = new twilio.twiml.MessagingResponse();
  if (text) response.message(text);
  return response.toString();
}

export async function readTwilioProfile(
  config: TwilioConfig = getTwilioConfig(),
  fetcher: typeof fetch = fetch,
): Promise<BusinessChannelInput> {
  checkConfig(config);
  return withTimeout(
    "Kredensial Twilio belum dapat diverifikasi",
    async (signal, aborted) => {
      const response = await Promise.race([
        fetcher(`${ACCOUNTS_URL}/${config.accountSid}.json`, {
          headers: { Authorization: basicAuth(config) },
          redirect: "error",
          signal,
        }),
        aborted,
      ]);
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        invalid("Kredensial Twilio belum dapat diverifikasi");
      }
      const account: unknown = await Promise.race([response.json(), aborted]);
      if (
        typeof account !== "object" ||
        account === null ||
        !("sid" in account) ||
        account.sid !== config.accountSid ||
        !("status" in account) ||
        account.status !== "active"
      )
        invalid("Kredensial Twilio belum dapat diverifikasi");
      // T5.11: status hanya memverifikasi akun Sandbox, bukan registrasi pengirim.
      return {
        status: "terhubung",
        phoneNumber: config.from.slice("whatsapp:+".length),
        connectedAt: null,
        packageName: "Twilio Sandbox",
        quota: null,
        checkedAt: new Date(),
      };
    },
  );
}
