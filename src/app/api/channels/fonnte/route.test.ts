import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createTestDatabase, type TestDatabase } from "@/lib/db/testing";
import { messages } from "@/lib/db/schema";
import { updateBusinessChannel } from "@/lib/data/business";
import { createProduct } from "@/lib/data/products";
import { recordStockMovement } from "@/lib/data/stock";

const state = vi.hoisted(() => ({
  test: undefined as TestDatabase | undefined,
  productId: "",
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

const SECRET = "rahasia-webhook";
const DEVICE = "6281200000001";
const SENDER = "6281200000002";

function request(payload: unknown, key?: string): Request {
  const url = new URL("https://warung.example/api/channels/fonnte");
  if (key !== undefined) url.searchParams.set("key", key);
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function inbound(
  inboxid: string,
  sender = SENDER,
  message = "Saya mau dua kilogram Beras Uji",
) {
  return {
    device: DEVICE,
    sender,
    message,
    name: "Bu Sari",
    inboxid,
    timestamp: "1710000000",
  };
}

function deepSeekReply(system: string, prompt: string): Response {
  const content = system.includes("Ubah pesanan")
    ? JSON.stringify(
        prompt.includes("dua kilogram")
          ? { items: [{ productId: state.productId, quantity: 2 }], unmatched: [] }
          : { items: [], unmatched: [] },
      )
    : JSON.stringify({ reply: "Warung buka pukul 07.00 sampai 20.00 WIB." });

  return Response.json({ choices: [{ message: { content } }] });
}

function stubFetcher() {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://api.deepseek.com")) {
      const body = JSON.parse(String(init?.body)) as {
        messages?: Array<{ content?: unknown }>;
      };
      const system = String(body.messages?.[0]?.content ?? "");
      const prompt = String(body.messages?.[1]?.content ?? "");
      return deepSeekReply(system, prompt);
    }
    if (url === "https://api.fonnte.com/send") {
      return Response.json({ status: true, detail: "success" });
    }
    throw new Error("URL tidak dikenal: " + url);
  });
}

function sendRequests(fetcher: ReturnType<typeof stubFetcher>) {
  return fetcher.mock.calls.filter(
    (call) => String(call[0]) === "https://api.fonnte.com/send",
  );
}

async function flushAfter(): Promise<void> {
  for (const callback of state.afterCallbacks.splice(0)) await callback();
}

describe("webhook Fonnte", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await createTestDatabase();
    state.test = test;
    await updateBusinessChannel(test.db, test.business.id, {
      status: "terhubung",
      packageName: "Fonnte",
      phoneNumber: DEVICE,
      connectedAt: null,
      quota: null,
      checkedAt: new Date(),
    });
    const product = await createProduct(test.db, test.business.id, {
      name: "Beras Uji",
      unit: "kilogram",
      salePrice: 15000,
      purchasePrice: 12000,
      minimumStock: 2,
    });
    state.productId = product.id;
    await recordStockMovement(test.db, test.business.id, {
      productId: product.id,
      kind: "masuk",
      quantityChange: 30,
      reason: "Stok awal",
    });
  });

  afterAll(async () => {
    state.test = undefined;
    await test.close();
  });

  beforeEach(() => {
    vi.stubEnv("FONNTE_TOKEN", "token-perangkat");
    vi.stubEnv("FONNTE_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("DEEPSEEK_API_KEY", "kunci-model");
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    state.afterCallbacks.length = 0;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("menolak pesan tanpa kunci atau dengan kunci salah", async () => {
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    expect((await POST(request(inbound("1")))).status).toBe(401);
    expect((await POST(request(inbound("1"), "salah"))).status).toBe(401);
    expect(state.afterCallbacks).toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("menyimpan pesanan lalu membalas lewat perangkat Fonnte", async () => {
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(request(inbound("101"), SECRET));
    expect(response.status).toBe(200);
    expect(state.afterCallbacks).toHaveLength(1);

    await flushAfter();

    const [saved] = await test.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.businessId, test.business.id),
          eq(messages.externalId, "fonnte:101"),
        ),
      );
    expect(saved?.body).toBe("Saya mau dua kilogram Beras Uji");

    const sends = sendRequests(fetcher);
    expect(sends).toHaveLength(1);
    const body = new URLSearchParams(String(sends[0]![1]?.body));
    expect(body.get("target")).toBe(SENDER);
    expect(body.get("inboxid")).toBe("101");
    expect(body.get("message")).toContain("Pesanan diterima");
    expect(body.get("message")).toContain("Rp30.000");
    expect(body.get("message")).toContain("Beras Uji");
  });

  it("membalas pertanyaan biasa dengan balasan model dan tidak menggandakan pesan ulang", async () => {
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    const payload = inbound("102", "6281200000003", "Warung buka sampai jam berapa?");
    await POST(request(payload, SECRET));
    await flushAfter();
    expect(sendRequests(fetcher)).toHaveLength(1);
    expect(
      new URLSearchParams(String(sendRequests(fetcher)[0]![1]?.body)).get("message"),
    ).toBe("Warung buka pukul 07.00 sampai 20.00 WIB.");

    await POST(request(payload, SECRET));
    await flushAfter();
    expect(sendRequests(fetcher)).toHaveLength(1);
  });

  it("mengirim pesan tanpa inboxid bila pesan tidak punya inboxid", async () => {
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    await POST(request(inbound("0"), SECRET));
    await flushAfter();

    const sends = sendRequests(fetcher);
    expect(sends).toHaveLength(1);
    expect(new URLSearchParams(String(sends[0]![1]?.body)).has("inboxid")).toBe(false);
  });

  it("mencoba kirim ulang tanpa inboxid bila Fonnte menolak inboxid", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://api.deepseek.com")) {
        const body = JSON.parse(String(init?.body)) as {
          messages?: Array<{ content?: unknown }>;
        };
        const system = String(body.messages?.[0]?.content ?? "");
        const prompt = String(body.messages?.[1]?.content ?? "");
        return deepSeekReply(system, prompt);
      }
      if (url === "https://api.fonnte.com/send") {
        const body = new URLSearchParams(String(init?.body));
        if (body.has("inboxid")) {
          return Response.json({ status: false, reason: "inboxid tidak dikenal" });
        }
        return Response.json({ status: true, detail: "success" });
      }
      throw new Error("URL tidak dikenal: " + url);
    });
    vi.stubGlobal("fetch", fetcher);

    await POST(request(inbound("104"), SECRET));
    await flushAfter();

    const sends = sendRequests(fetcher);
    expect(sends).toHaveLength(2);
    expect(new URLSearchParams(String(sends[0]![1]?.body)).get("inboxid")).toBe("104");
    expect(new URLSearchParams(String(sends[1]![1]?.body)).has("inboxid")).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("menerima pesan ketika nomor tersimpan memakai awalan nol", async () => {
    await updateBusinessChannel(test.db, test.business.id, {
      status: "terhubung",
      packageName: "Fonnte",
      phoneNumber: "081277880527",
      connectedAt: null,
      quota: null,
      checkedAt: new Date(),
    });
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    try {
      const payload = { ...inbound("105"), device: "6281277880527" };
      await POST(request(payload, SECRET));
      await flushAfter();
      expect(sendRequests(fetcher)).toHaveLength(1);
    } finally {
      await updateBusinessChannel(test.db, test.business.id, {
        status: "terhubung",
        packageName: "Fonnte",
        phoneNumber: DEVICE,
        connectedAt: null,
        quota: null,
        checkedAt: new Date(),
      });
    }
  });

  it("menolak payload yang tidak sesuai dan mengabaikan pesan grup", async () => {
    const fetcher = stubFetcher();
    vi.stubGlobal("fetch", fetcher);

    expect((await POST(request({}, SECRET))).status).toBe(400);
    expect((await POST(request({ device: DEVICE, sender: "abc" }, SECRET))).status).toBe(
      400,
    );
    expect(state.afterCallbacks).toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();

    const grouped = await POST(request({ member: "628111111111" }, SECRET));
    expect(grouped.status).toBe(200);
    expect(await grouped.json()).toEqual({ ok: true, ignored: true });
    expect(state.afterCallbacks).toHaveLength(0);
  });
});
