import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  findLatestSession,
  findSession,
  getOrStartSession,
  listLockedSessions,
  lockSession,
  releaseSession,
  startSession,
} from "./agent-sessions";
import { recordInboundMessage } from "./conversations";
import { createApproval } from "./approvals";
import { createProduct } from "./products";
import { createPurchaseOrder } from "./purchase-orders";

let test: TestDatabase;
let otherBusinessId: string;
let conversationId: string;
let otherConversationId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const inbound = await recordInboundMessage(test.db, test.business.id, {
    channel: "app",
    phoneNumber: "081200000001",
    customerName: "Pemilik Warung",
    body: "Catat penjualan beras lima kilogram",
  });
  const otherInbound = await recordInboundMessage(test.db, otherBusinessId, {
    channel: "app",
    phoneNumber: "081200000001",
    body: "Pesan warung tetangga",
  });

  conversationId = inbound.conversation.id;
  otherConversationId = otherInbound.conversation.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("sesi agen", () => {
  it("membuka sesi baru untuk sebuah percakapan", async () => {
    const session = await startSession(test.db, test.business.id, conversationId);

    expect(session.conversationId).toBe(conversationId);
    expect(session.lockStatus).toBe("bebas");
    expect(session.pendingApprovalId).toBeNull();
    expect(await findSession(test.db, test.business.id, session.id)).toMatchObject({
      id: session.id,
    });
  });

  it("menolak sesi pada percakapan warung lain", async () => {
    await expect(
      startSession(test.db, test.business.id, otherConversationId),
    ).rejects.toThrow("Percakapan tidak ditemukan pada warung ini");
    expect(await findSession(test.db, otherBusinessId, "bukan kunci")).toBeUndefined();
  });

  it("memakai kembali sesi yang sudah ada", async () => {
    const first = await getOrStartSession(test.db, test.business.id, conversationId);
    const second = await getOrStartSession(test.db, test.business.id, conversationId);

    expect(second.id).toBe(first.id);
    expect((await findLatestSession(test.db, test.business.id, conversationId))?.id).toBe(
      first.id,
    );
  });

  it("mengunci sesi selama menunggu persetujuan lalu melepasnya", async () => {
    const product = await createProduct(test.db, test.business.id, {
      name: "Beras",
      unit: "kilogram",
      salePrice: 15000,
      purchasePrice: 12000,
      minimumStock: 10,
    });
    const draft = await createPurchaseOrder(test.db, test.business.id, {
      supplierName: "Pasar Induk",
      items: [{ productId: product.id, quantity: 20, estimatedPrice: 12000 }],
    });
    const approval = await createApproval(test.db, test.business.id, {
      purchaseOrderId: draft.order.id,
      summary: "Tambah stok beras 20 kilogram",
    });
    const session = await getOrStartSession(test.db, test.business.id, conversationId);
    const locked = await lockSession(test.db, test.business.id, session.id, approval.id);

    expect(locked?.lockStatus).toBe("menunggu_persetujuan");
    expect(locked?.pendingApprovalId).toBe(approval.id);
    expect(await listLockedSessions(test.db, test.business.id)).toHaveLength(1);

    const released = await releaseSession(test.db, test.business.id, session.id);

    expect(released?.lockStatus).toBe("bebas");
    expect(released?.pendingApprovalId).toBeNull();
    expect(await listLockedSessions(test.db, test.business.id)).toEqual([]);
  });

  it("tidak mengunci sesi warung lain", async () => {
    const session = await getOrStartSession(test.db, test.business.id, conversationId);

    expect(
      await lockSession(
        test.db,
        otherBusinessId,
        session.id,
        "00000000-0000-0000-0000-000000000000",
      ),
    ).toBeUndefined();
    expect(await releaseSession(test.db, otherBusinessId, "bukan kunci")).toBeUndefined();
    expect((await findSession(test.db, test.business.id, session.id))?.lockStatus).toBe(
      "bebas",
    );
  });
});
