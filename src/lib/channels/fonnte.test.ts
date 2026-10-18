import { describe, expect, it, vi } from "vitest";
import { parseChannelEvent, readFonnteProfile, sendFonnteReply } from "./fonnte";

describe("penerjemah kanal WhatsApp", () => {
  it("memeriksa payload dan menormalkan nomor", () => {
    const event = parseChannelEvent({
      eventId: "uji1",
      phoneNumber: "081200000001",
      body: "Pesan beras",
      items: [{ productId: "produk", quantity: 2 }],
    });
    expect(event.phoneNumber).toBe("6281200000001");
    expect(event.items).toEqual([{ productId: "produk", quantity: 2 }]);
  });
  it("menolak jumlah dan nomor yang tidak sah", () => {
    expect(() =>
      parseChannelEvent({ eventId: "uji", phoneNumber: "abc", body: "Pesan" }),
    ).toThrow();
    expect(() =>
      parseChannelEvent({
        eventId: "uji",
        phoneNumber: "081200000001",
        body: "Pesan",
        items: [{ productId: "p", quantity: -1 }],
      }),
    ).toThrow();
    expect(() =>
      parseChannelEvent({ eventId: "uji", phoneNumber: "081200000001", body: "" }),
    ).toThrow();
  });
  it("membaca profil perangkat tanpa membocorkan token", async () => {
    const profile = await readFonnteProfile("rahasia", async (url, init) => {
      expect(url).toBe("https://api.fonnte.com/device");
      expect(new Headers(init?.headers).get("Authorization")).toBe("rahasia");
      return Response.json({
        status: true,
        device_status: "connect",
        device: "081277880527",
        package: "Free",
        quota: "50",
      });
    });
    expect(profile.status).toBe("terhubung");
    expect(profile.phoneNumber).toBe("6281277880527");
    expect(profile.quota).toBe(50);
  });
  it("menolak respons yang tidak sesuai skema", async () => {
    await expect(
      readFonnteProfile("rahasia", async () =>
        Response.json({ status: false, reason: "token invalid" }),
      ),
    ).rejects.toThrow("Koneksi WhatsApp belum dapat diperiksa");
    await expect(
      readFonnteProfile("rahasia", async () =>
        Response.json({ status: true, device_status: "connect", device: 42 }),
      ),
    ).rejects.toThrow();
  });
});

describe("pengiriman balasan Fonnte", () => {
  it("mengirim target dan pesan dengan token perangkat", async () => {
    await expect(
      sendFonnteReply(
        "rahasia",
        "081200000001",
        "Pesanan diterima",
        async (url, init) => {
          expect(url).toBe("https://api.fonnte.com/send");
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("Authorization")).toBe("rahasia");
          expect(init?.redirect).toBe("error");
          expect([...new URLSearchParams(String(init?.body)).entries()]).toEqual([
            ["target", "6281200000001"],
            ["message", "Pesanan diterima"],
          ]);
          return Response.json({ status: true, detail: "success" });
        },
      ),
    ).resolves.toBeUndefined();
  });

  it.each(["", "  ", "0812", "whatsapp:+6281200000001", "62812 0000001"])(
    "menolak tujuan tidak sah %s tanpa mengirim",
    async (target) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(sendFonnteReply("rahasia", target, "Pesan", fetcher)).rejects.toThrow(
        "Nomor WhatsApp tujuan belum sesuai",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("menolak token dan isi pesan kosong tanpa mengirim", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(sendFonnteReply(" ", "6281200000001", "Pesan", fetcher)).rejects.toThrow(
      "Token Fonnte belum diisi",
    );
    await expect(
      sendFonnteReply("rahasia", "6281200000001", " ", fetcher),
    ).rejects.toThrow("Isi balasan wajib diisi");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("mengabaikan inboxid nol atau bukan angka", async () => {
    for (const inboxId of ["0", "abc", undefined]) {
      await sendFonnteReply(
        "rahasia",
        "6281200000001",
        "Pesan",
        async (_url, init) => {
          const body = new URLSearchParams(String(init?.body));
          expect(body.has("inboxid")).toBe(false);
          return Response.json({ status: true });
        },
        inboxId,
      );
    }
  });

  it("menyimpan status dan alasan kegagalan Fonnte", async () => {
    await expect(
      sendFonnteReply(
        "rahasia",
        "6281200000001",
        "Pesan",
        async () => new Response("token invalid", { status: 401 }),
      ),
    ).rejects.toMatchObject({ status: 401, reason: "token invalid" });
    await expect(
      sendFonnteReply("rahasia", "6281200000001", "Pesan", async () =>
        Response.json({ status: false, reason: "device disconnected" }),
      ),
    ).rejects.toMatchObject({ reason: "device disconnected" });
  });

  it("menyamarkan kegagalan HTTP, status, dan jaringan", async () => {
    await expect(
      sendFonnteReply(
        "rahasia",
        "6281200000001",
        "Pesan",
        async () => new Response("rahasia", { status: 401 }),
      ),
    ).rejects.toThrow(/^Balasan WhatsApp lewat Fonnte belum dapat dikirim$/);
    await expect(
      sendFonnteReply("rahasia", "6281200000001", "Pesan", async () =>
        Response.json({ status: false, reason: "token invalid" }),
      ),
    ).rejects.toThrow(/^Balasan WhatsApp lewat Fonnte belum dapat dikirim$/);
    await expect(
      sendFonnteReply("rahasia", "6281200000001", "Pesan", async () => {
        throw new Error("rahasia");
      }),
    ).rejects.toThrow(/^Balasan WhatsApp lewat Fonnte belum dapat dikirim$/);
  });
});
