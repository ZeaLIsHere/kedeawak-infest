import { and, asc, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  conversations,
  messages,
  type Conversation,
  type Customer,
  type Message,
} from "../db/schema";
import {
  findCustomer,
  findOrCreateCustomer,
  phoneHash,
  readCustomerName,
  readCustomerPhone,
} from "./customers";
import { isUuid } from "./ids";
import { assertConversationOwned } from "./ownership";

/** Isi satu pesan yang akan disimpan. */
export type MessageInput = {
  readonly sender: Message["sender"];
  readonly kind: Message["kind"];
  readonly body?: string | null;
  readonly mediaUrl?: string | null;
};

/** Pesan masuk dari pelanggan, sebelum pelanggan dan percakapannya ditentukan. */
export type InboundMessageInput = {
  readonly channel: Conversation["channel"];
  readonly phoneNumber: string;
  readonly customerName?: string | null;
  readonly kind?: Message["kind"];
  readonly body?: string | null;
  readonly mediaUrl?: string | null;
};

/** Hasil pemrosesan satu pesan masuk. */
export type InboundMessageResult = {
  readonly customer: Customer;
  readonly conversation: Conversation;
  readonly message: Message;
};

/** Mencari percakapan yang sedang terbuka untuk satu nomor pelanggan. */
export async function findConversationByPhone(
  db: Database,
  businessId: string,
  phoneNumber: string,
): Promise<Conversation | undefined> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, businessId),
        eq(conversations.customerPhoneHash, phoneHash(phoneNumber)),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  return conversation;
}

/** Mengambil satu percakapan menurut kuncinya. */
export async function findConversation(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<Conversation | undefined> {
  if (!isUuid(conversationId)) {
    return undefined;
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.businessId, businessId), eq(conversations.id, conversationId)),
    )
    .limit(1);

  return conversation;
}

/** Seluruh percakapan warung, yang paling baru diperbarui lebih dulu. */
export async function listConversations(
  db: Database,
  businessId: string,
): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.businessId, businessId))
    .orderBy(desc(conversations.createdAt));
}

/** Ringkasan satu percakapan WhatsApp untuk daftar pesan masuk. */
export type WhatsAppConversationSummary = {
  readonly id: string;
  readonly customerName: string;
  readonly phone: string | null;
  readonly lastCustomerMessage: Message | undefined;
  readonly lastMessageAt: Date;
};

/**
 * Percakapan WhatsApp beserta pesan pelanggan terakhir.
 *
 * Balasan agen sengaja tidak ikut diringkas, karena daftar pesan masuk hanya
 * menampilkan isi pesan pelanggan. Nama dan nomor dibuka di lapisan data supaya
 * komponen tidak menyentuh sandi kolom.
 */
export async function listWhatsAppConversations(
  db: Database,
  businessId: string,
): Promise<WhatsAppConversationSummary[]> {
  const rows = (await listConversations(db, businessId)).filter(
    (conversation) => conversation.channel === "whatsapp",
  );

  const summaries = await Promise.all(
    rows.map(async (conversation) => {
      const [customer, conversationMessages] = await Promise.all([
        conversation.customerId === null
          ? Promise.resolve(undefined)
          : findCustomer(db, businessId, conversation.customerId),
        listMessages(db, businessId, conversation.id),
      ]);
      const customerMessages = conversationMessages.filter(
        (message) => message.sender === "customer",
      );
      const lastCustomerMessage = customerMessages.at(-1);

      return {
        id: conversation.id,
        customerName:
          customer === undefined
            ? "Data pelanggan dihapus"
            : (readCustomerName(customer) ?? "Pelanggan warung"),
        phone: customer === undefined ? null : readCustomerPhone(customer),
        lastCustomerMessage,
        lastMessageAt:
          lastCustomerMessage?.createdAt ??
          conversation.lastMessageAt ??
          conversation.createdAt,
      };
    }),
  );

  return summaries.sort(
    (left, right) => right.lastMessageAt.getTime() - left.lastMessageAt.getTime(),
  );
}

/** Pesan pesan dalam satu percakapan, dari yang paling lama. */
export async function listMessages(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.businessId, businessId),
        eq(messages.conversationId, conversationId),
      ),
    )
    .orderBy(asc(messages.createdAt));
}

/**
 * Menyisipkan satu pesan ke dalam percakapan, sekaligus memperbarui waktunya.
 *
 * Kepemilikan percakapan diperiksa lebih dulu, sebab kunci asing hanya
 * memeriksa keberadaan percakapan, bukan pemiliknya.
 */
export async function appendMessage(
  db: Database,
  businessId: string,
  conversationId: string,
  input: MessageInput,
): Promise<Message> {
  return db.transaction(async (tx) => {
    await assertConversationOwned(tx, businessId, conversationId);

    const [message] = await tx
      .insert(messages)
      .values({
        businessId,
        conversationId,
        sender: input.sender,
        kind: input.kind,
        body: input.body ?? null,
        mediaUrl: input.mediaUrl ?? null,
      })
      .returning();

    if (message === undefined) {
      throw new Error("Pesan gagal disimpan");
    }

    await tx
      .update(conversations)
      .set({ lastMessageAt: message.createdAt, status: "terbuka" })
      .where(
        and(
          eq(conversations.businessId, businessId),
          eq(conversations.id, conversationId),
        ),
      );

    return message;
  });
}

/**
 * Memproses satu pesan masuk dari pelanggan.
 *
 * Pelanggan dicari menurut sidik jari nomornya, lalu dibuat bila belum ada,
 * dan percakapan dengan pelanggan itu dipakai kembali. Fungsi ini titik masuk
 * tunggal bagi webhook penyedia kanal maupun panel pesan tiruan, sesuai
 * `docs/ARCHITECTURE.md` bagian 3 aturan 6.
 */
export async function recordInboundMessage(
  db: Database,
  businessId: string,
  input: InboundMessageInput,
): Promise<InboundMessageResult> {
  const customer = await findOrCreateCustomer(db, businessId, {
    name: input.customerName ?? null,
    phoneNumber: input.phoneNumber,
  });

  const existing = await findConversationByPhone(db, businessId, input.phoneNumber);
  const conversation =
    existing === undefined
      ? (
          await db
            .insert(conversations)
            .values({
              businessId,
              channel: input.channel,
              customerId: customer.id,
              customerPhoneHash: phoneHash(input.phoneNumber),
            })
            .returning()
        )[0]
      : existing.customerId === null
        ? (
            await db
              .update(conversations)
              .set({ customerId: customer.id })
              .where(
                and(
                  eq(conversations.businessId, businessId),
                  eq(conversations.id, existing.id),
                ),
              )
              .returning()
          )[0]
        : existing;

  if (conversation === undefined) {
    throw new Error("Percakapan gagal dibuat");
  }

  const message = await appendMessage(db, businessId, conversation.id, {
    sender: "customer",
    kind: input.kind ?? "text",
    body: input.body ?? null,
    mediaUrl: input.mediaUrl ?? null,
  });

  /*
   * Menyisipkan pesan juga memperbarui waktu pesan terakhir dan membuka
   * kembali percakapan yang sudah ditutup, sehingga percakapan dibaca ulang
   * supaya nilai yang dikembalikan sesuai dengan isi basis data.
   */
  const stored = await findConversation(db, businessId, conversation.id);

  return { customer, conversation: stored ?? conversation, message };
}

/** Menutup percakapan, misalnya setelah orderan selesai. */
export async function closeConversation(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<Conversation | undefined> {
  const [conversation] = await db
    .update(conversations)
    .set({ status: "selesai" })
    .where(
      and(eq(conversations.businessId, businessId), eq(conversations.id, conversationId)),
    )
    .returning();

  return conversation;
}
