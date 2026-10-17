import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { getOrStartSession } from "./agent-sessions";
import { recordInboundMessage } from "./conversations";
import {
  completeToolInvocation,
  listToolInvocations,
  recordToolInvocation,
} from "./tool-invocations";

let test: TestDatabase;
let otherBusinessId: string;
let sessionId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;

  const inbound = await recordInboundMessage(test.db, test.business.id, {
    channel: "app",
    phoneNumber: "081200000020",
    body: "Catat penjualan beras lima kilogram",
  });
  const session = await getOrStartSession(
    test.db,
    test.business.id,
    inbound.conversation.id,
  );

  sessionId = session.id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("jejak pemanggilan tool", () => {
  it("mencatat pemanggilan sebelum hasilnya diketahui", async () => {
    const invocation = await recordToolInvocation(test.db, test.business.id, {
      sessionId,
      toolName: "record_sale",
      arguments: { productName: "Beras", quantity: 5 },
    });

    expect(invocation.toolName).toBe("record_sale");
    expect(invocation.arguments).toEqual({ productName: "Beras", quantity: 5 });
    expect(invocation.result).toBeNull();
    expect(invocation.failed).toBe(false);
    expect(invocation.sessionId).toBe(sessionId);
  });

  it("melengkapi catatan dengan hasil yang berhasil", async () => {
    const pending = await listToolInvocations(test.db, test.business.id, { sessionId });
    const completed = await completeToolInvocation(
      test.db,
      test.business.id,
      pending[0]?.id ?? "",
      { result: { transactionId: "abc" }, failed: false },
    );

    expect(completed?.result).toEqual({ transactionId: "abc" });
    expect(completed?.failed).toBe(false);
  });

  it("mencatat pemanggilan yang gagal", async () => {
    const invocation = await recordToolInvocation(test.db, test.business.id, {
      toolName: "read_stock",
      arguments: { productName: "Gula" },
    });
    const completed = await completeToolInvocation(
      test.db,
      test.business.id,
      invocation.id,
      { result: { message: "Produk tidak dikenal" }, failed: true },
    );

    expect(completed?.failed).toBe(true);
    expect(completed?.sessionId).toBeNull();
  });

  it("mengurutkan jejak dari yang paling baru dan membatasinya", async () => {
    const list = await listToolInvocations(test.db, test.business.id);

    expect(list).toHaveLength(2);
    expect(list[0]?.toolName).toBe("read_stock");
    expect(
      await listToolInvocations(test.db, test.business.id, { limit: 1 }),
    ).toHaveLength(1);
  });

  it("memisahkan jejak antar warung", async () => {
    const other = await recordToolInvocation(test.db, otherBusinessId, {
      toolName: "read_stock",
      arguments: {},
    });

    expect(await listToolInvocations(test.db, otherBusinessId)).toHaveLength(1);
    expect(await listToolInvocations(test.db, test.business.id)).toHaveLength(2);
    expect(
      await completeToolInvocation(test.db, test.business.id, other.id, {
        result: null,
        failed: true,
      }),
    ).toBeUndefined();
    expect(
      await completeToolInvocation(test.db, test.business.id, "bukan kunci", {
        result: null,
        failed: true,
      }),
    ).toBeUndefined();
  });
});
