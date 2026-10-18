import { afterEach, describe, expect, it, vi } from "vitest";

const { transcribeAudio, readSubscription, withCurrentBusiness } = vi.hoisted(() => ({
  transcribeAudio: vi.fn(),
  readSubscription: vi.fn(),
  withCurrentBusiness: vi.fn(),
}));
vi.mock("@/lib/ai/speech", () => ({ transcribeAudio }));
vi.mock("@/lib/data/subscription", () => ({ readSubscription }));
vi.mock("@/lib/data/server", () => ({ withCurrentBusiness }));

import { transcribeSpeechAction } from "./speech";

readSubscription.mockResolvedValue({ active: true });
withCurrentBusiness.mockImplementation(
  async (read: (db: object, businessId: string) => unknown) =>
    read({}, "00000000-0000-0000-0000-000000000001"),
);

afterEach(() => {
  vi.clearAllMocks();
});

function formWith(bytes: number[], type = "audio/webm"): FormData {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array(bytes)], "rekaman", { type }));
  return form;
}

describe("aksi transkripsi suara", () => {
  it("mengirim rekaman ke lapisan suara dan mengembalikan teks", async () => {
    transcribeAudio.mockResolvedValue("Dua beras dan satu kopi");
    const result = await transcribeSpeechAction(formWith([1, 2, 3]));
    expect(result).toEqual({ ok: true, text: "Dua beras dan satu kopi" });
    expect(transcribeAudio).toHaveBeenCalledTimes(1);
    const [bytes, type] = transcribeAudio.mock.calls[0] as [Uint8Array, string];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(3);
    expect(type).toBe("audio/webm");
  });

  it("memakai tipe bawaan saat tipe berkas kosong", async () => {
    transcribeAudio.mockResolvedValue("Beras");
    await transcribeSpeechAction(formWith([1], ""));
    expect((transcribeAudio.mock.calls[0] as [Uint8Array, string])[1]).toBe("audio/webm");
  });

  it("menolak rekaman kosong tanpa memanggil layanan", async () => {
    const result = await transcribeSpeechAction(formWith([]));
    expect(result.ok).toBe(false);
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("menolak permintaan tanpa berkas audio", async () => {
    const result = await transcribeSpeechAction(new FormData());
    expect(result.ok).toBe(false);
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("menolak transkripsi pada paket Free", async () => {
    readSubscription.mockResolvedValueOnce({ active: false });
    const result = await transcribeSpeechAction(formWith([1]));
    expect(result.ok).toBe(false);
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("meneruskan pesan galat yang aman dari lapisan suara", async () => {
    transcribeAudio.mockRejectedValue(
      new Error("Format rekaman suara belum didukung. Silakan ketik ulang pesan Anda."),
    );
    const result = await transcribeSpeechAction(formWith([1], "audio/aac"));
    expect(result).toEqual({
      ok: false,
      error: "Format rekaman suara belum didukung. Silakan ketik ulang pesan Anda.",
    });
  });
});
