import twilio from "twilio";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadTwilioMedia,
  getTwilioConfig,
  parseTwilioMessage,
  readTwilioProfile,
  sendTwilioReply,
  twimlReply,
  validateTwilioSignature,
  type TwilioConfig,
} from "./twilio";

const config: TwilioConfig = {
  accountSid: "AC" + "a".repeat(32),
  authToken: "rahasia",
  from: "whatsapp:+14155238886",
  webhookUrl: "https://warung.example/api/channels/whatsapp?tenant=warung",
};
const messageSid = "SM" + "b".repeat(32);
const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages/${messageSid}/Media/ME${"c".repeat(32)}`;
const params = {
  AccountSid: config.accountSid,
  To: config.from,
  From: "whatsapp:+6281200000001",
  MessageSid: messageSid,
  Body: "Pesan beras",
  NumMedia: "0",
  ProfileName: "Ibu Sari",
};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const media = { url: mediaUrl, contentType: "image/png" };
const auth =
  "Basic " + Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

function mediaResponse(bytes: Uint8Array = png, contentType = "image/png") {
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": contentType },
  });
}

function setConfigEnv() {
  vi.stubEnv("TWILIO_ACCOUNT_SID", config.accountSid);
  vi.stubEnv("TWILIO_AUTH_TOKEN", config.authToken);
  vi.stubEnv("TWILIO_WHATSAPP_FROM", config.from);
  vi.stubEnv("WEBHOOK_URL", config.webhookUrl);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("konfigurasi dan tanda tangan Twilio", () => {
  it("membaca konfigurasi tanpa mengubah URL tanda tangan", () => {
    setConfigEnv();
    expect(getTwilioConfig()).toEqual(config);
  });

  it.each([
    ["TWILIO_ACCOUNT_SID", "ACsalah"],
    ["TWILIO_ACCOUNT_SID", "ac" + "a".repeat(32)],
    ["WEBHOOK_URL", "https:warung.example/api/channels/whatsapp"],
    ["TWILIO_AUTH_TOKEN", "  "],
    ["TWILIO_WHATSAPP_FROM", "whatsapp:081200000001"],
    ["WEBHOOK_URL", "http://warung.example/api/channels/whatsapp"],
    ["WEBHOOK_URL", "https://warung.example/api/channels/whatsapp#pesan"],
    ["WEBHOOK_URL", "https://user:secret@warung.example/api/channels/whatsapp"],
    ["WEBHOOK_URL", "https://warung.example/api/channels/lain"],
  ])("menolak konfigurasi %s yang tidak sesuai", (key, value) => {
    setConfigEnv();
    vi.stubEnv(key, value);
    expect(() => getTwilioConfig()).toThrow();
  });

  it("memakai tanda tangan SDK resmi dan menolak perubahan isi maupun URL", () => {
    const signature = twilio.getExpectedTwilioSignature(
      config.authToken,
      config.webhookUrl,
      params,
    );
    expect(validateTwilioSignature(config, signature, params)).toBe(true);
    expect(
      validateTwilioSignature(config, signature, { ...params, Body: "Pesan gula" }),
    ).toBe(false);
    expect(
      validateTwilioSignature(
        { ...config, webhookUrl: config.webhookUrl + "&x=1" },
        signature,
        params,
      ),
    ).toBe(false);
    expect(validateTwilioSignature(config, "", params)).toBe(false);
    expect(validateTwilioSignature(config, "tidak sah", params)).toBe(false);
  });
});

describe("pesan masuk Twilio", () => {
  it("menerjemahkan teks dan nomor pelanggan", () => {
    expect(parseTwilioMessage(params, config)).toEqual({
      eventId: messageSid,
      phoneNumber: "6281200000001",
      customerName: "Ibu Sari",
      body: "Pesan beras",
    });
  });

  it.each([
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/ogg; codecs=opus",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/flac",
  ])("menerima lampiran %s tanpa teks", (contentType) => {
    const result = parseTwilioMessage(
      {
        ...params,
        Body: "",
        NumMedia: "1",
        MediaUrl0: mediaUrl,
        MediaContentType0: contentType,
      },
      config,
    );
    expect(result.body).toBe("");
    expect(result.media).toEqual({
      url: mediaUrl,
      contentType: contentType.split(";")[0],
    });
  });

  it.each([
    { AccountSid: "AC" + "d".repeat(32) },
    { To: "whatsapp:+14155238887" },
    { From: "https://127.0.0.1" },
    { From: "whatsapp:+012345" },
    { MessageSid: "SMsalah" },
    { MessageSid: "sm" + "b".repeat(32) },
    { Body: "x".repeat(4001) },
    { Body: "" },
    { NumMedia: "2" },
    { NumMedia: "1.0" },
    { NumMedia: "-1" },
    { NumMedia: "01" },
    { NumMedia: "1" },
  ])("menolak pesan yang tidak sesuai kasus %#", (patch) => {
    expect(() => parseTwilioMessage({ ...params, ...patch }, config)).toThrow();
  });

  it("menerima batas teks dan SID pesan multimedia", () => {
    const result = parseTwilioMessage(
      {
        ...params,
        MessageSid: "MM" + "b".repeat(32),
        Body: "x".repeat(4000),
        ProfileName: "",
      },
      config,
    );
    expect(result.body).toHaveLength(4000);
    expect(result.customerName).toBeUndefined();
  });

  it("menolak format lampiran dengan pesan aman", () => {
    expect(() =>
      parseTwilioMessage(
        {
          ...params,
          Body: "",
          NumMedia: "1",
          MediaUrl0: mediaUrl,
          MediaContentType0: "text/html; rahasia",
        },
        config,
      ),
    ).toThrow("Format lampiran belum didukung");
  });
});

describe("lampiran AAC", () => {
  it("menolak AAC pada pesan masuk karena belum ada konversi audio", () => {
    expect(() =>
      parseTwilioMessage(
        {
          ...params,
          Body: "",
          NumMedia: "1",
          MediaUrl0: mediaUrl,
          MediaContentType0: "audio/aac",
        },
        config,
      ),
    ).toThrow("Format lampiran belum didukung");
  });

  it("menolak unduhan AAC sebelum mengirim permintaan termasuk octet stream", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        mediaResponse(new Uint8Array([255, 241, 0, 0]), "application/octet-stream"),
      );
    await expect(
      downloadTwilioMedia({ ...media, contentType: "audio/aac" }, config, fetcher),
    ).rejects.toThrow("Format lampiran belum didukung");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("unduhan media Twilio", () => {
  it("mengirim Basic Auth hanya ke URL media API akun sendiri", async () => {
    const result = await downloadTwilioMedia(media, config, async (url, init) => {
      expect(String(url)).toBe(mediaUrl);
      expect(new Headers(init?.headers).get("Authorization")).toBe(auth);
      expect(init?.redirect).toBe("manual");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return mediaResponse();
    });
    expect(result).toEqual({ bytes: png, contentType: "image/png" });
  });

  it.each([
    "http://api.twilio.com/2010-04-01/Accounts/x/Messages/x/Media/x",
    "https://127.0.0.1/media",
    "https://[::1]/media",
    "https://localhost/media",
    "https://api.twilio.com.evil.example/media",
    mediaUrl.replace("api.twilio.com", "api.twilio.com:444"),
    mediaUrl.replace("api.twilio.com", "user:secret@api.twilio.com"),
    mediaUrl.replace(config.accountSid, "AC" + "d".repeat(32)),
    mediaUrl + "?redirect=https://evil.example",
    mediaUrl + "#fragment",
    mediaUrl.replace("/Media/", "/Media/../Media/"),
    mediaUrl.replace("/Media/", "/%4dedia/"),
  ])("menolak URL awal berbahaya tanpa melakukan permintaan %s", async (url) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      downloadTwilioMedia({ ...media, url }, config, fetcher),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["media.twiliocdn.com", "mms.twiliocdn.com", "media.us1.twilio.com"])(
    "mengikuti CDN %s tanpa kredensial",
    async (host) => {
      const fetcher = vi.fn<typeof fetch>();
      fetcher.mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: `https://${host}/media?token=abc` },
        }),
      );
      fetcher.mockImplementationOnce(async (url, init) => {
        expect(String(url)).toBe(`https://${host}/media?token=abc`);
        expect(new Headers(init?.headers).has("Authorization")).toBe(false);
        return mediaResponse();
      });
      await expect(downloadTwilioMedia(media, config, fetcher)).resolves.toEqual({
        bytes: png,
        contentType: "image/png",
      });
    },
  );

  it.each([
    "https://evil.example/a",
    "https://twilio.com.evil.example/a",
    "https://127.0.0.1/a",
    "https://[::1]/a",
    "http://media.twiliocdn.com/a",
    "https://user:secret@media.twiliocdn.com/a",
    "https://media.twiliocdn.com:444/a",
    "https://media.twiliocdn.com./a",
  ])("menolak redirect berbahaya %s", async (location) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { Location: location } }),
      );
    await expect(downloadTwilioMedia(media, config, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("tetap tidak mengirim kredensial ketika redirect kembali ke API", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://media.twiliocdn.com/a" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 307, headers: { Location: mediaUrl } }),
      )
      .mockImplementationOnce(async (_url, init) => {
        expect(new Headers(init?.headers).has("Authorization")).toBe(false);
        return mediaResponse();
      });
    await expect(downloadTwilioMedia(media, config, fetcher)).resolves.toBeDefined();
  });

  it("mengikuti paling banyak tiga redirect", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://media.twiliocdn.com/a" },
      }),
    );
    await expect(downloadTwilioMedia(media, config, fetcher)).rejects.toThrow(
      "Pengalihan lampiran terlalu banyak",
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it.each([401, 404, 500])("menolak kegagalan HTTP %s", async (status) => {
    await expect(
      downloadTwilioMedia(media, config, async () => new Response("rahasia", { status })),
    ).rejects.toThrow("Lampiran WhatsApp belum dapat diunduh");
  });

  it("menolak respons kosong, redirect tanpa tujuan, dan MIME berbeda", async () => {
    await expect(
      downloadTwilioMedia(media, config, async () => mediaResponse(new Uint8Array())),
    ).rejects.toThrow("Lampiran WhatsApp kosong");
    await expect(
      downloadTwilioMedia(media, config, async () => new Response(null, { status: 302 })),
    ).rejects.toThrow();
    await expect(
      downloadTwilioMedia(media, config, async () => mediaResponse(png, "image/jpeg")),
    ).rejects.toThrow("Format lampiran tidak sesuai");
    await expect(
      downloadTwilioMedia(media, config, async () => mediaResponse(png, "text/html")),
    ).rejects.toThrow();
  });

  it("menormalkan parameter MIME audio", async () => {
    const audio = { ...media, contentType: "audio/ogg; codecs=opus" };
    await expect(
      downloadTwilioMedia(audio, config, async () =>
        mediaResponse(new TextEncoder().encode("OggSdata"), "Audio/Ogg; codecs=opus"),
      ),
    ).resolves.toMatchObject({ contentType: "audio/ogg" });
  });

  it("menerima octet stream hanya bila magic header sesuai deklarasi", async () => {
    await expect(
      downloadTwilioMedia(media, config, async () =>
        mediaResponse(png, "application/octet-stream"),
      ),
    ).resolves.toMatchObject({ contentType: "image/png" });
    await expect(
      downloadTwilioMedia(media, config, async () =>
        mediaResponse(new TextEncoder().encode("<html>"), "application/octet-stream"),
      ),
    ).rejects.toThrow("Format lampiran tidak sesuai");
  });

  it.each([
    ["image/png", 3 * 1024 * 1024],
    ["audio/ogg", 16 * 1024 * 1024],
  ])(
    "membatasi byte %s saat streaming tanpa Content Length",
    async (contentType, limit) => {
      let cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(limit));
          controller.enqueue(new Uint8Array(1));
        },
        cancel() {
          cancelled = true;
        },
      });
      await expect(
        downloadTwilioMedia(
          { ...media, contentType },
          config,
          async () => new Response(stream, { headers: { "Content-Type": contentType } }),
        ),
      ).rejects.toThrow("Ukuran lampiran terlalu besar");
      expect(cancelled).toBe(true);
    },
  );

  it("menolak Content Length di atas batas sebelum membaca isi", async () => {
    await expect(
      downloadTwilioMedia(
        media,
        config,
        async () =>
          new Response(png, {
            headers: {
              "Content-Type": "image/png",
              "Content-Length": String(3 * 1024 * 1024 + 1),
            },
          }),
      ),
    ).rejects.toThrow("Ukuran lampiran terlalu besar");
  });

  it("menyamarkan kegagalan jaringan dan streaming", async () => {
    await expect(
      downloadTwilioMedia(media, config, async () => {
        throw new Error(config.authToken);
      }),
    ).rejects.toThrow("Lampiran WhatsApp belum dapat diunduh");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error(config.authToken));
      },
    });
    await expect(
      downloadTwilioMedia(
        media,
        config,
        async () => new Response(stream, { headers: { "Content-Type": "image/png" } }),
      ),
    ).rejects.toThrow("Lampiran WhatsApp belum dapat diunduh");
  });

  it("menerima tepat tiga redirect dan menghapus kredensial pada redirect relatif", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://media.twiliocdn.com/awal" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 303, headers: { Location: "/kedua" } }),
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 308, headers: { Location: "/akhir" } }),
      )
      .mockImplementationOnce(async (url, init) => {
        expect(String(url)).toBe("https://media.twiliocdn.com/akhir");
        expect(new Headers(init?.headers).has("Authorization")).toBe(false);
        return mediaResponse();
      });
    await expect(downloadTwilioMedia(media, config, fetcher)).resolves.toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("membatalkan stream yang macet setelah header diterima", async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const result = downloadTwilioMedia(
      media,
      config,
      async () => new Response(stream, { headers: { "Content-Type": "image/png" } }),
    );
    const assertion = expect(result).rejects.toThrow(
      "Lampiran WhatsApp belum dapat diunduh",
    );
    await vi.advanceTimersByTimeAsync(12_000);
    await assertion;
    expect(cancelled).toBe(true);
  });

  it("menghentikan unduhan yang macet dengan timeout", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const result = downloadTwilioMedia(media, config, async (_url, init) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("timeout")), {
          once: true,
        });
      });
    });
    const assertion = expect(result).rejects.toThrow(
      "Lampiran WhatsApp belum dapat diunduh",
    );
    await vi.advanceTimersByTimeAsync(12_000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });
});

describe("pengiriman balasan Twilio", () => {
  it.each(["SM", "MM"])(
    "mengirim formulir balasan dan memvalidasi SID %s",
    async (prefix) => {
      const text = "Beras & gula + kopi = Rp15.000\nTerima kasih";
      await expect(
        sendTwilioReply(config, "6281200000001", text, async (url, init) => {
          expect(String(url)).toBe(
            `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          );
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("Authorization")).toBe(auth);
          expect(new Headers(init?.headers).get("Content-Type")).toBe(
            "application/x-www-form-urlencoded",
          );
          expect(init?.redirect).toBe("error");
          expect(init?.signal).toBeInstanceOf(AbortSignal);
          expect([...new URLSearchParams(String(init?.body)).entries()]).toEqual([
            ["From", config.from],
            ["To", "whatsapp:+6281200000001"],
            ["Body", text],
          ]);
          return Response.json({ sid: prefix + "b".repeat(32) }, { status: 201 });
        }),
      ).resolves.toBeUndefined();
    },
  );

  it("menerima teks tepat 1600 karakter", async () => {
    await expect(
      sendTwilioReply(config, "6281200000001", "a".repeat(1600), async () =>
        Response.json({ sid: messageSid }),
      ),
    ).resolves.toBeUndefined();
  });

  it.each([
    "",
    "0",
    "081200000001",
    "1",
    "1".repeat(16),
    "+6281200000001",
    "whatsapp:+6281200000001",
    "62812 0000001",
    "6281200000001&Body=lain",
    "https://127.0.0.1",
  ])("menolak nomor tujuan tidak sah %s tanpa permintaan", async (to) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      sendTwilioReply(config, to, "Pesanan diterima", fetcher),
    ).rejects.toThrow("Nomor WhatsApp tujuan belum sesuai");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["", " \n\t", "x".repeat(1601)])(
    "menolak isi balasan tidak sah kasus %# tanpa permintaan",
    async (text) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        sendTwilioReply(config, "6281200000001", text, fetcher),
      ).rejects.toThrow("Isi balasan wajib diisi dan maksimal 1600 karakter");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...config, accountSid: "ACsalah" },
    { ...config, authToken: " " },
    { ...config, from: "whatsapp:+0123" },
  ])("memvalidasi konfigurasi sebelum autentikasi kasus %#", async (input) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      sendTwilioReply(input, "6281200000001", "Pesanan diterima", fetcher),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([302, 400, 401, 403, 429, 500])(
    "menolak HTTP %s tanpa meneruskan kredensial atau pesan penyedia",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(config.authToken, {
          status,
          headers: { Location: "https://evil.example/pesan" },
        }),
      );
      await expect(
        sendTwilioReply(config, "6281200000001", "Pesanan diterima", fetcher),
      ).rejects.toThrow(/^Balasan WhatsApp belum dapat dikirim$/);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][1]?.redirect).toBe("error");
    },
  );

  it.each([
    null,
    [],
    {},
    { sid: 42 },
    { sid: "SMsalah" },
    { sid: "sm" + "b".repeat(32) },
    { sid: "AC" + "b".repeat(32) },
  ])("menolak respons sukses dengan SID tidak sah kasus %#", async (body) => {
    await expect(
      sendTwilioReply(config, "6281200000001", "Pesanan diterima", async () =>
        Response.json(body),
      ),
    ).rejects.toThrow(/^Balasan WhatsApp belum dapat dikirim$/);
  });

  it("menyamarkan galat jaringan dan JSON yang tidak sesuai", async () => {
    await expect(
      sendTwilioReply(config, "6281200000001", "Pesanan diterima", async () => {
        throw new Error(config.authToken);
      }),
    ).rejects.toThrow(/^Balasan WhatsApp belum dapat dikirim$/);
    await expect(
      sendTwilioReply(
        config,
        "6281200000001",
        "Pesanan diterima",
        async () => new Response(config.authToken),
      ),
    ).rejects.toThrow(/^Balasan WhatsApp belum dapat dikirim$/);
  });

  it.each([false, true])(
    "membatasi waktu pengiriman termasuk pembacaan respons kasus %#",
    async (headersReceived) => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const result = sendTwilioReply(
        config,
        "6281200000001",
        "Pesanan diterima",
        async (_url, init) => {
          signal = init?.signal;
          return headersReceived
            ? new Response(new ReadableStream<Uint8Array>())
            : new Promise<Response>(() => {});
        },
      );
      const assertion = expect(result).rejects.toThrow(
        /^Balasan WhatsApp belum dapat dikirim$/,
      );
      await vi.advanceTimersByTimeAsync(11_999);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await assertion;
      expect(signal?.aborted).toBe(true);
    },
  );
});

describe("profil akun dan TwiML", () => {
  it("memeriksa akun aktif tanpa mengklaim registrasi pengirim", async () => {
    const result = await readTwilioProfile(config, async (url, init) => {
      expect(String(url)).toBe(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
      );
      expect(new Headers(init?.headers).get("Authorization")).toBe(auth);
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return Response.json({ sid: config.accountSid, status: "active" });
    });
    expect(result).toMatchObject({
      status: "terhubung",
      phoneNumber: "14155238886",
      packageName: "Twilio Sandbox",
      quota: null,
      connectedAt: null,
    });
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it("membaca konfigurasi bawaan untuk profil", async () => {
    setConfigEnv();
    await expect(
      readTwilioProfile(undefined, async () =>
        Response.json({ sid: config.accountSid, status: "active" }),
      ),
    ).resolves.toMatchObject({ packageName: "Twilio Sandbox" });
  });

  it.each([
    { sid: config.accountSid, status: "suspended" },
    { sid: "AC" + "d".repeat(32), status: "active" },
    null,
  ])("menolak profil tidak sah tanpa mengungkap rahasia %j", async (body) => {
    await expect(
      readTwilioProfile(config, async () => Response.json(body)),
    ).rejects.toThrow("Kredensial Twilio belum dapat diverifikasi");
  });

  it("menolak kegagalan HTTP dan jaringan profil", async () => {
    await expect(
      readTwilioProfile(
        config,
        async () => new Response(config.authToken, { status: 401 }),
      ),
    ).rejects.toThrow("Kredensial Twilio belum dapat diverifikasi");
    await expect(
      readTwilioProfile(config, async () => {
        throw new Error(config.authToken);
      }),
    ).rejects.toThrow("Kredensial Twilio belum dapat diverifikasi");
  });

  it("membatasi waktu pemeriksaan akun termasuk isi respons", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const result = readTwilioProfile(config, async (_url, init) => {
      signal = init?.signal;
      return new Response(new ReadableStream<Uint8Array>());
    });
    const assertion = expect(result).rejects.toThrow(
      "Kredensial Twilio belum dapat diverifikasi",
    );
    await vi.advanceTimersByTimeAsync(12_000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it("menghasilkan TwiML kosong atau balasan dengan XML yang di escape SDK", () => {
    const empty = new twilio.twiml.MessagingResponse();
    expect(twimlReply()).toBe(empty.toString());
    const response = new twilio.twiml.MessagingResponse();
    response.message('Beras < gula & "kopi"');
    expect(twimlReply('Beras < gula & "kopi"')).toBe(response.toString());
    expect(
      twimlReply("</Message><Redirect>https://evil.example</Redirect>"),
    ).not.toContain("<Redirect>");
  });
});
