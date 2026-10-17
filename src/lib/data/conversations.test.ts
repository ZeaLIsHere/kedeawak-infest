import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  appendMessage,
  closeConversation,
  findConversationByPhone,
  listConversations,
  listMessages,
  listWhatsAppConversations,
  recordInboundMessage,
} from "./conversations";
import { readCustomerName } from "./customers";

let test: TestDatabase;
let otherBusinessId: string;
const customerPhone = "081298765432";

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("data percakapan", () => {
  it("membuat pelanggan, percakapan, dan pesan dari satu pesan masuk", async () => {
    const result = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber: customerPhone,
      customerName: "Bu Rina",
      body: "Ada beras?",
    });

    expect(readCustomerName(result.customer)).toBe("Bu Rina");
    expect(result.conversation.channel).toBe("whatsapp");
    expect(result.conversation.status).toBe("terbuka");
    expect(result.conversation.customerId).toBe(result.customer.id);
    expect(result.message.sender).toBe("customer");
    expect(result.message.kind).toBe("text");
    expect(result.message.body).toBe("Ada beras?");
  });

  it("menyimpan sidik jari nomor, bukan nomornya", async () => {
    const conversation = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );

    expect(conversation?.customerPhoneHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(conversation?.customerPhoneHash).not.toContain("81298765432");
  });

  it("memakai kembali pelanggan dan percakapan yang sama untuk pesan berikutnya", async () => {
    const first = await findConversationByPhone(test.db, test.business.id, customerPhone);
    const next = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber: "6281298765432",
      body: "Yang lima kilogram",
    });

    expect(next.conversation.id).toBe(first?.id);
    expect(await listConversations(test.db, test.business.id)).toHaveLength(1);
    expect(
      await listMessages(test.db, test.business.id, next.conversation.id),
    ).toHaveLength(2);
  });

  it("mencatat pesan dari pemilik dan agen pada percakapan yang sama", async () => {
    const conversation = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );
    const conversationId = conversation?.id ?? "";

    await appendMessage(test.db, test.business.id, conversationId, {
      sender: "owner",
      kind: "text",
      body: "Ada, lima kilogram cukup",
    });

    const reply = await appendMessage(test.db, test.business.id, conversationId, {
      sender: "agent",
      kind: "text",
      body: "Siap, pesanan dicatat",
    });

    const conversationAfter = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );

    expect(reply.sender).toBe("agent");
    expect(conversationAfter?.lastMessageAt?.getTime()).toBe(reply.createdAt.getTime());
    expect(conversationAfter?.status).toBe("terbuka");
  });

  it("mengurutkan pesan dari yang paling lama", async () => {
    const conversation = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );
    const messages = await listMessages(
      test.db,
      test.business.id,
      conversation?.id ?? "",
    );

    expect(messages.map((message) => message.body)).toEqual([
      "Ada beras?",
      "Yang lima kilogram",
      "Ada, lima kilogram cukup",
      "Siap, pesanan dicatat",
    ]);
  });

  it("menerima pesan suara dan gambar", async () => {
    const voice = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber: "081200000010",
      kind: "voice",
      body: "Catat penjualan beras lima kilogram",
      mediaUrl: "https://contoh.test/suara.ogg",
    });

    expect(voice.message.kind).toBe("voice");
    expect(voice.message.mediaUrl).toBe("https://contoh.test/suara.ogg");
  });

  it("meringkas pesan pelanggan terakhir tanpa balasan agen", async () => {
    const summaries = await listWhatsAppConversations(test.db, test.business.id);
    const conversation = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );
    const own = summaries.find((summary) => summary.id === conversation?.id);
    const voice = summaries.find((summary) => summary.phone === "081200000010");

    expect(own?.customerName).toBe("Bu Rina");
    expect(own?.phone).toBe(customerPhone);
    expect(own?.lastCustomerMessage?.body).toBe("Yang lima kilogram");
    expect(voice?.lastCustomerMessage?.kind).toBe("voice");
  });

  it("menutup percakapan dan membukanya kembali saat ada pesan baru", async () => {
    const conversation = await findConversationByPhone(
      test.db,
      test.business.id,
      customerPhone,
    );
    const closed = await closeConversation(
      test.db,
      test.business.id,
      conversation?.id ?? "",
    );

    expect(closed?.status).toBe("selesai");

    const reopened = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber: customerPhone,
      body: "Tambah dua kilogram",
    });

    expect(reopened.conversation.status).toBe("terbuka");
  });

  it("memisahkan percakapan antar warung", async () => {
    await recordInboundMessage(test.db, otherBusinessId, {
      channel: "whatsapp",
      phoneNumber: customerPhone,
      body: "Pesan untuk warung tetangga",
    });

    const own = await listConversations(test.db, test.business.id);
    const other = await listConversations(test.db, otherBusinessId);

    expect(other).toHaveLength(1);
    expect(
      own.every((conversation) => conversation.businessId === test.business.id),
    ).toBe(true);
    expect(own.map((conversation) => conversation.id)).not.toContain(other[0]?.id);
  });

  it("tidak menulis pesan ke percakapan warung lain", async () => {
    const other = await listConversations(test.db, otherBusinessId);

    await expect(
      appendMessage(test.db, test.business.id, other[0]?.id ?? "", {
        sender: "owner",
        kind: "text",
        body: "Bukan milikku",
      }),
    ).rejects.toThrow();
  });
});
