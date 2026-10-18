import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createTestDatabase, type TestDatabase } from "../db/testing";
import { getOwnerConversation } from "../data/agent-context";
import { listTransactions } from "../data/transactions";
import { findProduct, createProduct } from "../data/products";
import { recordStockMovement } from "../data/stock";
import { listApprovals } from "../data/approvals";
import { readQuotaUsage } from "../data/quota-usage";
import { summarizeDay } from "../data/reports";
import { orchestrateAgentMessage } from "./orchestrator";
let t: TestDatabase;
let conversationId: string;
let productId: string;
beforeAll(async () => {
  t = await createTestDatabase();
  conversationId = (await getOwnerConversation(t.db, t.business.id)).id;
  const p = await createProduct(t.db, t.business.id, {
    name: "Gula",
    unit: "kg",
    salePrice: 10000,
    purchasePrice: 8000,
    minimumStock: 5,
  });
  productId = p.id;
  await recordStockMovement(t.db, t.business.id, {
    productId,
    kind: "masuk",
    quantityChange: 2,
    reason: "Stok awal",
  });
}, 60000);
afterAll(async () => t.close());
const provider = (value: unknown) => ({ complete: async () => value });
const run = (text: string, p?: ReturnType<typeof provider>, extra = {}) =>
  orchestrateAgentMessage(
    t.db,
    t.business.id,
    { conversationId, text, ...extra },
    { provider: p },
  );
describe("orkestrasi agen", () => {
  it("mode lokal menampilkan laporan nyata secara jujur", async () => {
    const r = await run("laporan hari ini");
    expect(r.mode).toBe("lokal");
    expect(r.reply).toContain("Rp0");
  });
  it("menjalankan tool yang dipilih model tanpa mempercayai jawaban teksnya", async () => {
    const r = await run(
      "beli kantong dua ribu",
      provider({
        tool: "create_expense",
        arguments: { description: "Beli kantong", amount: 2000 },
        reply: "Palsu",
      }),
    );
    expect(r.reply).toContain("Rp2.000");
    expect(await listTransactions(t.db, t.business.id, { kind: "expense" })).toHaveLength(
      1,
    );
    const summary = await summarizeDay(t.db, t.business.id);
    expect(summary.expenses).toBeGreaterThanOrEqual(2000);
  });
  it("foto dengan keyakinan rendah tidak mencatat transaksi sebelum konfirmasi", async () => {
    const r = await run(
      "",
      provider({
        description: "Belanja warung",
        amount: 150000,
        date: "2026-10-18",
        confidence: 0.6,
      }),
      { image: "data:image/png;base64,YQ==" },
    );
    expect(r.receipt).toMatchObject({ amount: 150000 });
    expect(await listTransactions(t.db, t.business.id, { kind: "expense" })).toHaveLength(
      1,
    );
  });
  it("pesan lanjutan tidak menimpa konfirmasi struk", async () => {
    const r = await run(
      "catat beli minyak",
      provider({
        tool: "create_expense",
        arguments: { description: "Minyak", amount: 9999 },
      }),
    );
    expect(r.awaitingReceipt).toBe(true);
    expect(await listTransactions(t.db, t.business.id, { kind: "expense" })).toHaveLength(
      1,
    );
  });
  it("konfirmasi struk hanya dicatat sekali", async () => {
    await run("ya");
    await run("ya");
    expect(
      (await listTransactions(t.db, t.business.id, { kind: "expense" }))
        .map((t) => t.amount)
        .sort((a, b) => a - b),
    ).toEqual([2000, 150000]);
  });
  it("draft mengunci konteks sampai keputusan tanpa membuat transaksi baru", async () => {
    await run(
      "restok gula",
      provider({ tool: "create_purchase_order", arguments: { product_id: productId } }),
    );
    expect(await listApprovals(t.db, t.business.id, "menunggu")).toHaveLength(1);
    await run(
      "catat belanja",
      provider({
        tool: "create_expense",
        arguments: { description: "Belanja", amount: 1234 },
      }),
    );
    expect(await listTransactions(t.db, t.business.id, { kind: "expense" })).toHaveLength(
      2,
    );
  });
  it("persetujuan melalui jawaban pemilik menambah stok sekali", async () => {
    await run("setujui");
    const stock = (await findProduct(t.db, t.business.id, productId))?.stock;
    await run("setujui");
    expect((await findProduct(t.db, t.business.id, productId))?.stock).toBe(stock);
    expect(stock).toBeGreaterThan(2);
  });
  it("kuota membatasi pemanggilan penyedia secara atomik", async () => {
    const used = await readQuotaUsage(t.db, t.business.id);
    const r = await orchestrateAgentMessage(
      t.db,
      t.business.id,
      { conversationId, text: "stok gula" },
      {
        provider: provider({ tool: "check_stock", arguments: { product_id: productId } }),
        dailyLimit: used,
      },
    );
    expect(r.reply).toContain("Kuota");
    expect(await readQuotaUsage(t.db, t.business.id)).toBe(used);
  });
  it("kegagalan model menghasilkan pengganti lokal yang jujur", async () => {
    const r = await run("stok gula", {
      complete: async () => {
        throw Error("secret");
      },
    });
    expect(r.mode).toBe("lokal");
    expect(r.reply).not.toContain("secret");
    expect(r.reply).toContain("10");
  });
});
