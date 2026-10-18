import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestDatabase, type TestDatabase } from "../db/testing";
import { recordInboundMessage } from "../data/conversations";
import { createProduct } from "../data/products";
import { composeCustomerReply } from "./customer-reply";
import type { AIProvider } from "./provider";

describe("balasan AI untuk pelanggan WhatsApp", () => {
  let test: TestDatabase;
  let conversationId: string;

  beforeAll(async () => {
    test = await createTestDatabase();
    await createProduct(test.db, test.business.id, {
      name: "Beras Pandan Wangi",
      unit: "kilogram",
      salePrice: 15000,
      purchasePrice: 12000,
      minimumStock: 2,
    });
    const incoming = await recordInboundMessage(test.db, test.business.id, {
      channel: "whatsapp",
      phoneNumber: "6281200000001",
      customerName: "Bu Sari",
      body: "Apakah beras tersedia?",
    });
    conversationId = incoming.conversation.id;
  });

  afterAll(async () => {
    await test.close();
  });

  it("memakai konteks produk dan tidak membocorkan laporan keuangan", async () => {
    const complete = vi.fn<AIProvider["complete"]>(async () => ({
      reply: "Beras Pandan Wangi tersedia, harganya Rp15.000 per kilogram.",
    }));
    const provider: AIProvider = { complete };

    const reply = await composeCustomerReply(
      test.db,
      test.business.id,
      conversationId,
      "Apakah beras tersedia?",
      provider,
    );

    expect(reply).toBe("Beras Pandan Wangi tersedia, harganya Rp15.000 per kilogram.");
    const prompt = String(complete.mock.calls[0]?.[0].prompt);
    expect(prompt).toContain("Beras Pandan Wangi");
    expect(prompt).toContain("15000");
    expect(prompt).not.toContain("laba");
    expect(prompt).not.toContain("expenses");
  });

  it("membersihkan emoji dan tanda hubung dari balasan", async () => {
    const provider: AIProvider = {
      complete: async () => ({ reply: "Halo 👋 stok 10-kilogram masih ada" }),
    };

    await expect(
      composeCustomerReply(
        test.db,
        test.business.id,
        conversationId,
        "Stok beras?",
        provider,
      ),
    ).resolves.toBe("Halo stok 10 kilogram masih ada");
  });

  it("menata daftar produk menjadi daftar bernomor per baris", async () => {
    const provider: AIProvider = {
      complete: async () => ({
        reply: "Contoh yang tersedia: 1. Beras 2. Gula 3. Kopi",
      }),
    };

    await expect(
      composeCustomerReply(
        test.db,
        test.business.id,
        conversationId,
        "Produk apa saja yang tersedia?",
        provider,
      ),
    ).resolves.toBe("Contoh yang tersedia:\n1. Beras\n2. Gula\n3. Kopi");
  });

  it("mengembalikan kosong saat penyedia gagal", async () => {
    const provider: AIProvider = {
      complete: async () => {
        throw new Error("rahasia penyedia");
      },
    };

    await expect(
      composeCustomerReply(
        test.db,
        test.business.id,
        conversationId,
        "Stok beras?",
        provider,
      ),
    ).resolves.toBeUndefined();
  });
});
