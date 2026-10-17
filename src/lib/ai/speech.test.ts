import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speechConstructor, transcribeAudio } from "./speech";

const audio = new Uint8Array([79, 103, 103, 83, 0, 1, 2, 3]);
const apiKey = "gsk_rahasia_pengujian";
const providerError = `Internal provider error: Bearer ${apiKey}`;

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", apiKey);
  vi.stubEnv("GROQ_TRANSCRIPTION_MODEL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function expectSafeFailure(result: Promise<unknown>, reason?: RegExp) {
  const error: unknown = await result.catch((error: unknown) => error);
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw new Error("Galat tidak ditemukan");
  expect(error.message).toMatch(/ketik ulang/i);
  if (reason) expect(error.message).toMatch(reason);
  expect(`${error.message}\n${error.stack}\n${JSON.stringify(error)}`).not.toContain(
    apiKey,
  );
  expect(error.message).not.toContain(providerError);
  expect(error.cause).toBeUndefined();
}

it("memilih pengenal suara yang disediakan peramban", () => {
  const standard = class {};
  const webkit = class {};
  expect(
    speechConstructor({ SpeechRecognition: standard, webkitSpeechRecognition: webkit }),
  ).toBe(standard);
  expect(speechConstructor({ webkitSpeechRecognition: webkit })).toBe(webkit);
  expect(speechConstructor({})).toBeUndefined();
});

describe("transkripsi rekaman suara", () => {
  it("mengirim multipart OGG ke Groq dan mengembalikan teks tanpa menafsirkannya", async () => {
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe(`Bearer ${apiKey}`);
      expect(headers.has("Content-Type")).toBe(false);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.signal?.aborted).toBe(false);
      expect(init?.body).toBeInstanceOf(FormData);
      if (!(init?.body instanceof FormData)) throw new Error("Multipart tidak ditemukan");
      const form = init.body;
      expect(form.get("model")).toBe("whisper-large-v3-turbo");
      expect(form.get("language")).toBe("id");
      expect(form.get("response_format")).toBe("json");
      expect(form.get("temperature")).toBe("0");
      expect([...form.keys()].sort()).toEqual([
        "file",
        "language",
        "model",
        "response_format",
        "temperature",
      ]);
      const file = form.get("file");
      expect(file).toBeInstanceOf(File);
      if (!(file instanceof File)) throw new Error("Berkas tidak ditemukan");
      expect(file.name).toBe("audio.ogg");
      expect(file.type).toBe("audio/ogg");
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(audio);
      const request = new Request(url, init);
      expect(request.headers.get("Content-Type")).toMatch(
        /^multipart\/form-data; boundary=/,
      );
      expect((await request.formData()).get("language")).toBe("id");
      return Response.json({ text: "  Pesan dua beras dan satu kopi. \n" });
    });

    await expect(transcribeAudio(audio, "audio/ogg", fetcher)).resolves.toBe(
      "Pesan dua beras dan satu kopi.",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    [" Audio/OGG ; codecs=opus", "audio/ogg", "ogg"],
    ["audio/mpeg", "audio/mpeg", "mp3"],
    ["audio/mp4", "audio/mp4", "mp4"],
    ["audio/wav", "audio/wav", "wav"],
    ["audio/x-wav", "audio/x-wav", "wav"],
    ["audio/webm; codecs=opus", "audio/webm", "webm"],
    ["audio/flac", "audio/flac", "flac"],
  ])(
    "menormalkan %s dan memakai ekstensi berkas yang sesuai",
    async (contentType, mime, extension) => {
      const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
        const file = (init?.body as FormData).get("file") as File;
        expect(file.type).toBe(mime);
        expect(file.name).toBe(`audio.${extension}`);
        return Response.json({ text: "Pesan beras" });
      });
      await expect(transcribeAudio(audio, contentType, fetcher)).resolves.toBe(
        "Pesan beras",
      );
    },
  );

  it("memakai model dari konfigurasi dan fetch bawaan", async () => {
    vi.stubEnv("GROQ_TRANSCRIPTION_MODEL", "whisper-large-v3");
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect((init?.body as FormData).get("model")).toBe("whisper-large-v3");
      return Response.json({ text: "Tambah kopi" });
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(transcribeAudio(audio, "audio/ogg")).resolves.toBe("Tambah kopi");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("memakai model bawaan jika konfigurasi hanya berisi spasi", async () => {
    vi.stubEnv("GROQ_TRANSCRIPTION_MODEL", "  ");
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect((init?.body as FormData).get("model")).toBe("whisper-large-v3-turbo");
      return Response.json({ text: "Beras" });
    });
    await expect(transcribeAudio(audio, "audio/ogg", fetcher)).resolves.toBe("Beras");
  });

  it.each([undefined, "", "  "])(
    "menolak kunci yang belum diisi (%s) tanpa menghubungi penyedia",
    async (key) => {
      vi.stubEnv("GROQ_API_KEY", key);
      const fetcher = vi.fn<typeof fetch>();
      await expectSafeFailure(
        transcribeAudio(audio, "audio/ogg", fetcher),
        /konfigurasi/i,
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    "audio/aac",
    "video/mp4",
    "image/png",
    "application/octet-stream",
    "audio/ogg palsu",
    "",
  ])("menolak format %s sebelum mengirim audio", async (mime) => {
    const fetcher = vi.fn<typeof fetch>();
    await expectSafeFailure(transcribeAudio(audio, mime, fetcher), /format/i);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([0, 16 * 1024 * 1024 + 1])(
    "menolak ukuran %i byte sebelum mengirim audio",
    async (size) => {
      const fetcher = vi.fn<typeof fetch>();
      await expectSafeFailure(
        transcribeAudio(new Uint8Array(size), "audio/ogg", fetcher),
        /kosong|ukuran/i,
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("menerima tepat 16 MB", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(((init?.body as FormData).get("file") as File).size).toBe(16 * 1024 * 1024);
      return Response.json({ text: "Beras" });
    });
    await expect(
      transcribeAudio(new Uint8Array(16 * 1024 * 1024), "audio/ogg", fetcher),
    ).resolves.toBe("Beras");
  });

  it.each([400, 401, 403, 429, 500, 503])(
    "menangani HTTP %i tanpa membocorkan respons atau mencoba ulang",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>(
        async () => new Response(providerError, { status }),
      );
      await expectSafeFailure(transcribeAudio(audio, "audio/ogg", fetcher));
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("tidak meneruskan galat jaringan yang memuat rahasia", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error(providerError);
    });
    await expectSafeFailure(transcribeAudio(audio, "audio/ogg", fetcher));
  });

  it("menolak JSON yang tidak sah tanpa membocorkan isinya", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(providerError));
    await expectSafeFailure(transcribeAudio(audio, "audio/ogg", fetcher));
  });

  it.each([
    ["null", null],
    ["larik", []],
    ["tanpa teks", {}],
    ["teks null", { text: null }],
    ["teks angka", { text: 123 }],
    ["teks kosong", { text: "" }],
    ["teks spasi", { text: " \n\t" }],
    ["teks terlalu panjang", { text: "a".repeat(3801) }],
  ])("menolak jawaban yang bukan transkrip sah (%s)", async (_label, body) => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(body));
    await expectSafeFailure(transcribeAudio(audio, "audio/ogg", fetcher));
  });

  it("menerima transkrip tepat 3800 karakter tanpa memotongnya", async () => {
    const text = "a".repeat(3800);
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ text }));
    await expect(transcribeAudio(audio, "audio/ogg", fetcher)).resolves.toBe(text);
  });

  it.each(["permintaan", "pembacaan respons"])(
    "membatasi waktu %s dan membatalkan sinyal meskipun penyedia macet",
    async (stage) => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
        signal = init?.signal;
        if (stage === "permintaan") return new Promise<Response>(() => {});
        return new Response(new ReadableStream({ start() {} }));
      });
      const result = transcribeAudio(audio, "audio/ogg", fetcher);
      const checked = expectSafeFailure(result, /waktu/i);
      await vi.advanceTimersByTimeAsync(20_000);
      await checked;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("membersihkan timer setelah berhasil atau gagal", async () => {
    vi.useFakeTimers();
    await transcribeAudio(audio, "audio/ogg", async () =>
      Response.json({ text: "Beras" }),
    );
    expect(vi.getTimerCount()).toBe(0);
    await expectSafeFailure(
      transcribeAudio(audio, "audio/ogg", async () => {
        throw new Error(providerError);
      }),
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
