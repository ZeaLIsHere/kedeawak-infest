import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProvider } from "./provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockProvider() {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ choices: [{ message: { content: "{}" } }] }),
    );
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("DEEPSEEK_API_KEY", "kunci-uji");
  return fetcher;
}

function bodyOf(fetcher: ReturnType<typeof mockProvider>): Record<string, unknown> {
  return JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
}

describe("pemilihan model DeepSeek", () => {
  it("memakai DEEPSEEK_MODEL saat override teks dan gambar kosong", async () => {
    const fetcher = mockProvider();
    vi.stubEnv("DEEPSEEK_MODEL", "model-bersama");
    vi.stubEnv("DEEPSEEK_CHAT_MODEL", "");
    vi.stubEnv("DEEPSEEK_VISION_MODEL", "");

    await getAIProvider()?.complete({ system: "sistem", prompt: "teks" });

    expect(bodyOf(fetcher).model).toBe("model-bersama");
  });

  it("mendahulukan override khusus gambar di atas DEEPSEEK_MODEL", async () => {
    const fetcher = mockProvider();
    vi.stubEnv("DEEPSEEK_MODEL", "model-bersama");
    vi.stubEnv("DEEPSEEK_VISION_MODEL", "model-gambar");

    await getAIProvider()?.complete({
      system: "sistem",
      prompt: "gambar",
      image: "data:image/png;base64,YQ==",
    });

    expect(bodyOf(fetcher).model).toBe("model-gambar");
  });
});
