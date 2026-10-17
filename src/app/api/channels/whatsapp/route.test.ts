import twilio from "twilio";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/lib/db/testing";
import { messages } from "@/lib/db/schema";
import { updateBusinessChannel } from "@/lib/data/business";
import { and, eq } from "drizzle-orm";

const state = vi.hoisted(() => ({
  test: undefined as TestDatabase | undefined,
  afterCallbacks: [] as Array<() => void | Promise<void>>,
}));

vi.mock("next/server", () => ({
  after: (callback: () => void | Promise<void>) => {
    state.afterCallbacks.push(callback);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/server", () => ({
  withCurrentBusiness: async (
    read: (db: TestDatabase["db"], businessId: string) => Promise<unknown>,
  ) => (state.test ? read(state.test.db, state.test.business.id) : undefined),
}));

import { POST } from "./route";

const config = {
  accountSid: "AC" + "a".repeat(32),
  authToken: "rahasia",
  from: "whatsapp:+14155238886",
  webhookUrl: "https://warung.ngrok.app/api/channels/whatsapp",
};

function params(sid = "SM" + "b".repeat(32)) {
  return {
    AccountSid: config.accountSid,
    To: config.from,
    From: "whatsapp:+6281200000001",
    MessageSid: sid,
    Body: "Halo warung",
    NumMedia: "0",
    ProfileName: "Ibu Sari",
  };
}

function request(
  values: Record<string, string>,
  signature?: string,
): Request {
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
  });
  if (signature !== undefined) headers.set("X-Twilio-Signature", signature);
  return new Request(config.webhookUrl, {
    method: "POST",
    headers,
    body: new URLSearchParams(values).toString(),
  });
}

function signed(values: Record<string, string>): Request {
  return request(
    values,
    twilio.getExpectedTwilioSignature(config.authToken, config.webhookUrl, values),
  );
}

async function flushAfter(): Promise<void> {
  for (const callback of state.afterCallbacks.splice(0)) await callback();
}

describe("webhook Twilio", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await createTestDatabase();
    state.test = test;
    await updateBusinessChannel(test.db, test.business.id, {
      status: "terhubung",
      packageName: "Twilio Sandbox",
      phoneNumber: "14155238886",
      connectedAt: null,
      quota: null,
      checkedAt: new Date(),
    });
  });

  afterAll(async () => {
    state.test = undefined;
    await test.close();
  });

  afterEach(() => {
    state.afterCallbacks.length = 0;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("menolak pesan tanpa tanda tangan atau dengan tanda tangan salah", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", config.accountSid);
    vi.stubEnv("TWILIO_AUTH_TOKEN", config.authToken);
    vi.stubEnv("TWILIO_WHATSAPP_FROM", config.from);
    vi.stubEnv("WEBHOOK_URL", config.webhookUrl);

    expect((await POST(request(params()))).status).toBe(403);
    expect((await POST(request(params(), "salah"))).status).toBe(403);
    expect(state.afterCallbacks).toHaveLength(0);
  });

  it("mengembalikan TwiML kosong lalu memproses pesan dan membalas lewat REST", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", config.accountSid);
    vi.stubEnv("TWILIO_AUTH_TOKEN", config.authToken);
    vi.stubEnv("TWILIO_WHATSAPP_FROM", config.from);
    vi.stubEnv("WEBHOOK_URL", config.webhookUrl);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ sid: "SM" + "c".repeat(32) }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetcher);

    const sid = "SM" + "d".repeat(32);
    const response = await POST(signed(params(sid)));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<Response");
    expect(state.afterCallbacks).toHaveLength(1);

    await flushAfter();

    const [saved] = await test.db
      .select()
      .from(messages)
      .where(and(eq(messages.businessId, test.business.id), eq(messages.externalId, sid)));
    expect(saved?.body).toBe("Halo warung");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    );
    expect(new URLSearchParams(String(init?.body)).get("To")).toBe(
      "whatsapp:+6281200000001",
    );
  });

  it("tidak membalas ulang pesan dengan SID yang sama", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", config.accountSid);
    vi.stubEnv("TWILIO_AUTH_TOKEN", config.authToken);
    vi.stubEnv("TWILIO_WHATSAPP_FROM", config.from);
    vi.stubEnv("WEBHOOK_URL", config.webhookUrl);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ sid: "SM" + "e".repeat(32) }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetcher);

    const values = params("SM" + "f".repeat(32));
    expect((await POST(signed(values))).status).toBe(200);
    await flushAfter();
    expect(fetcher).toHaveBeenCalledTimes(1);

    expect((await POST(signed(values))).status).toBe(200);
    await flushAfter();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
