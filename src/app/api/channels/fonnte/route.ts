import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { receiveFonnteMessage, type FonnteInbound } from "@/lib/channels/fonnte-intake";
import {
  FonnteSendError,
  fonnteInboxId,
  safeChannelText,
  sendFonnteReply,
} from "@/lib/channels/fonnte";
import { withCurrentBusiness } from "@/lib/data/server";

const PATHS = ["/whatsapp", "/", "/stok", "/laporan"];

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function digits(value: string): string {
  const normalized = value.trim().replace(/^\+/, "");
  return normalized.startsWith("0") ? `62${normalized.slice(1)}` : normalized;
}

function authorized(request: Request, expected: string): boolean {
  const actual = new URL(request.url).searchParams.get("key") ?? "";
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function mediaKind(extension: string | undefined, url: string | undefined) {
  const value = (extension ?? url?.split("?")[0]?.split(".").at(-1) ?? "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(value)) return "image" as const;
  if (["ogg", "mp3", "mp4", "wav", "webm", "flac", "aac", "amr"].includes(value)) {
    return "voice" as const;
  }
  return "text" as const;
}

function parsePayload(payload: unknown): FonnteInbound | "ignore" | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  const data = payload as Record<string, unknown>;
  if (text(data.member) !== undefined) return "ignore";

  const device = text(data.device);
  const sender = text(data.sender);
  if (device === undefined || sender === undefined) return undefined;
  if (!/^\d{8,15}$/.test(digits(device)) || !/^\d{8,15}$/.test(digits(sender))) {
    return undefined;
  }

  const body = text(data.message) ?? text(data.text) ?? "";
  const url = text(data.url);
  if (!body && url === undefined) return undefined;
  const extension = text(data.extension);
  const kind = url === undefined ? "text" : mediaKind(extension, url);
  const name = text(data.name);
  const inbox = data.inboxid;
  const inboxId = fonnteInboxId(
    typeof inbox === "string" || typeof inbox === "number" ? String(inbox) : undefined,
  );
  const timestamp = text(String(data.timestamp ?? "")) ?? "";
  const eventId =
    inboxId !== undefined
      ? `fonnte:${inboxId}`
      : `fonnte:${createHash("sha256")
          .update([digits(device), digits(sender), timestamp, body, url ?? ""].join("|"))
          .digest("hex")}`;

  return {
    eventId,
    deviceNumber: digits(device),
    phoneNumber: digits(sender),
    ...(name === undefined ? {} : { customerName: name }),
    body: body || "Lampiran pelanggan",
    kind,
    ...(url === undefined ? {} : { mediaUrl: url }),
    ...(inboxId === undefined ? {} : { inboxId }),
  };
}

function describeFonnteError(error: unknown): string {
  if (error instanceof FonnteSendError) {
    return (
      [error.status === undefined ? undefined : `status ${error.status}`, error.reason]
        .filter((value): value is string => value !== undefined && value !== "")
        .join(", ") || error.message
    );
  }
  return error instanceof Error ? error.message : "Kesalahan tidak dikenal";
}

async function processMessage(message: FonnteInbound, token: string): Promise<void> {
  try {
    const result = await withCurrentBusiness(async (db, businessId) => {
      const outcome = await receiveFonnteMessage(db, businessId, message);
      if (!outcome.duplicate) {
        const reply = safeChannelText(outcome.reply) || "Pesan sudah diterima.";
        try {
          await sendFonnteReply(
            token,
            message.phoneNumber,
            reply,
            fetch,
            message.inboxId,
          );
        } catch (error) {
          if (message.inboxId === undefined) throw error;
          console.error(
            "Balasan Fonnte dengan inboxid gagal, mencoba tanpa inboxid",
            message.eventId,
            describeFonnteError(error),
          );
          await sendFonnteReply(token, message.phoneNumber, reply, fetch);
        }
      }
      return outcome;
    });
    if (result && !result.duplicate) {
      for (const path of PATHS) revalidatePath(path);
    }
  } catch (error) {
    console.error(
      "Pemrosesan pesan Fonnte belum berhasil",
      message.eventId,
      describeFonnteError(error),
    );
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ ok: true });
}

export async function POST(request: Request): Promise<Response> {
  const token = process.env.FONNTE_TOKEN?.trim();
  const secret = process.env.FONNTE_WEBHOOK_SECRET?.trim();
  if (!token || !secret) {
    return Response.json(
      { error: "Penerima pesan Fonnte belum diatur" },
      { status: 503 },
    );
  }
  if (!authorized(request, secret)) {
    return Response.json({ error: "Akses pesan tidak diizinkan" }, { status: 401 });
  }

  let message: FonnteInbound | "ignore" | undefined;
  try {
    message = parsePayload(await request.json());
  } catch {
    message = undefined;
  }
  if (message === "ignore") return Response.json({ ok: true, ignored: true });
  if (message === undefined) {
    return Response.json({ error: "Pesan belum sesuai" }, { status: 400 });
  }

  after(() => processMessage(message, token));
  return Response.json({ ok: true });
}
