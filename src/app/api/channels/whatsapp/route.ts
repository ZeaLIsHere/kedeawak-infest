import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { withCurrentBusiness } from "@/lib/data/server";
import {
  getTwilioConfig,
  parseTwilioMessage,
  sendTwilioReply,
  twimlReply,
  validateTwilioSignature,
  type TwilioConfig,
  type TwilioMessage,
} from "@/lib/channels/twilio";
import { receiveTwilioMessage } from "@/lib/channels/twilio-intake";
import { safeChannelText } from "@/lib/channels/fonnte";

const PATHS = ["/whatsapp", "/", "/stok", "/laporan"];

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }, // lint-ui-ignore: MIME resmi HTTP
  });
}

function readParams(form: FormData): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (const [key, value] of form) {
    if (typeof value !== "string") return undefined;
    params[key] = value;
  }
  return params;
}

async function processMessage(
  config: TwilioConfig,
  message: TwilioMessage,
): Promise<void> {
  try {
    const result = await withCurrentBusiness(async (db, businessId) => {
      const outcome = await receiveTwilioMessage(db, businessId, message, config);
      // Pesan ulang tidak dibalas lagi supaya retry Twilio tidak menggandakan balasan.
      if (!outcome.duplicate) {
        await sendTwilioReply(config, message.phoneNumber, safeChannelText(outcome.reply));
      }
      return outcome;
    });
    if (result && !result.duplicate) {
      for (const path of PATHS) revalidatePath(path);
    }
  } catch (error) {
    // Kegagalan pemrosesan latar tidak boleh membocorkan kredensial ke respons.
    console.error(
      "Pemrosesan pesan WhatsApp belum berhasil",
      error instanceof Error ? error.message : "Kesalahan tidak dikenal",
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  let config: TwilioConfig;
  try {
    config = getTwilioConfig();
  } catch {
    return textResponse("Penerima pesan belum diatur", 503);
  }

  const length = Number(request.headers.get("content-length") ?? 0); // lint-ui-ignore: nama header HTTP resmi
  if (Number.isFinite(length) && length > 1_000_000) {
    return textResponse("Pesan terlalu besar", 413);
  }

  let params: Record<string, string> | undefined;
  try {
    params = readParams(await request.formData());
  } catch {
    return textResponse("Pesan belum sesuai", 400);
  }
  if (!params) return textResponse("Pesan belum sesuai", 400);

  const signature = request.headers.get("X-Twilio-Signature") ?? ""; // lint-ui-ignore: nama header resmi Twilio
  if (!validateTwilioSignature(config, signature, params)) {
    return textResponse("Tanda tangan pesan tidak sah", 403);
  }

  let message: TwilioMessage;
  try {
    message = parseTwilioMessage(params, config);
  } catch (error) {
    console.error(
      "Pesan Twilio ditolak",
      error instanceof Error ? error.message : "Kesalahan tidak dikenal",
      "media",
      params.NumMedia ?? "0",
      "tipe",
      params.MediaContentType0 ?? "tidak ada",
    );
    return textResponse("Pesan belum sesuai", 400);
  }

  // Twilio menerima TwiML kosong lebih dulu; pemrosesan dan balasan REST
  // berjalan setelah respons selesai. Ini bukan worker tahan restart.
  after(() => processMessage(config, message));

  return new Response(twimlReply(), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" }, // lint-ui-ignore: MIME resmi TwiML
  });
}
