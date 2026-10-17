import { describe, expect, it } from "vitest";
import { parseChannelEvent, readFonnteProfile } from "./fonnte";

describe("penerjemah kanal WhatsApp", () => {
  it("memeriksa payload dan menormalkan nomor", () => {
    const event = parseChannelEvent({eventId:"uji1", phoneNumber:"081200000001", body:"Pesan beras", items:[{productId:"produk",quantity:2}]});
    expect(event.phoneNumber).toBe("6281200000001");
    expect(event.items).toEqual([{productId:"produk",quantity:2}]);
  });
  it("menolak jumlah dan nomor yang tidak sah", () => {
    expect(()=>parseChannelEvent({eventId:"uji",phoneNumber:"abc",body:"Pesan"})).toThrow();
    expect(()=>parseChannelEvent({eventId:"uji",phoneNumber:"081200000001",body:"Pesan",items:[{productId:"p",quantity:-1}]})).toThrow();
    expect(()=>parseChannelEvent({eventId:"uji",phoneNumber:"081200000001",body:""})).toThrow();
  });
  it("membaca profil perangkat tanpa membocorkan token", async () => {
    const profile = await readFonnteProfile("rahasia", async (url,init)=>{
      expect(url).toBe("https://api.fonnte.com/device");
      expect(new Headers(init?.headers).get("Authorization")).toBe("rahasia");
      return Response.json({status:true,device_status:"connect",device:"6281200000001",package:"Free",quota:"50"});
    });
    expect(profile.status).toBe("terhubung");
    expect(profile.quota).toBe(50);
  });
  it("menolak respons yang tidak sesuai skema", async () => {
    await expect(readFonnteProfile("rahasia", async ()=>Response.json({status:false,reason:"token invalid"}))).rejects.toThrow("Koneksi WhatsApp belum dapat diperiksa");
    await expect(readFonnteProfile("rahasia", async ()=>Response.json({status:true,device_status:"connect",device:42}))).rejects.toThrow();
  });
});
