"use server";
import { withCurrentBusiness } from "@/lib/data/server";
import { listProducts } from "@/lib/data/products";
import { parseSaleTranscript, parseProductTranscript } from "@/lib/ai/transcript";
export async function parseSaleTranscriptAction(text: string) {
  try {
    return (
      (await withCurrentBusiness(async (db, id) =>
        parseSaleTranscript(text, await listProducts(db, id)),
      )) ?? { ok: false as const, error: "Data warung belum tersedia." }
    );
  } catch {
    return {
      ok: false as const,
      error: "Pesanan belum dapat diproses. Gunakan keranjang manual.",
    };
  }
}
export async function parseProductTranscriptAction(text: string) {
  return parseProductTranscript(text);
}

import { revalidatePath } from "next/cache";
import { getOwnerConversation } from "@/lib/data/agent-context";
import { listMessages } from "@/lib/data/conversations";
import { readSubscription } from "@/lib/data/subscription";
import { orchestrateAgentMessage } from "@/lib/ai/orchestrator";
export async function sendAgentMessageAction(input: { text: string; image?: string }) {
  try {
    const response = await withCurrentBusiness(async (db, id) => {
      const subscription = await readSubscription(db, id);
      if (input.image && !subscription?.active)
        return {
          ok: false as const,
          error:
            "Fitur foto struk tersedia pada paket Gold. Buka halaman Pengaturan untuk mengaktifkannya.",
        };
      const conversation = await getOwnerConversation(db, id);
      const result = await orchestrateAgentMessage(db, id, {
        ...input,
        conversationId: conversation.id,
      });
      const messages = await listMessages(db, id, conversation.id);
      return {
        ok: true as const,
        ...result,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          body: m.body ?? "",
          createdAt: m.createdAt.toISOString(),
        })),
      };
    });
    for (const path of ["/percakapan", "/", "/laporan", "/stok", "/persetujuan"])
      revalidatePath(path);
    return response ?? { ok: false as const, error: "Data warung belum tersedia." };
  } catch {
    return {
      ok: false as const,
      error: "Pesan belum dapat diproses. Coba kembali atau gunakan formulir manual.",
    };
  }
}
