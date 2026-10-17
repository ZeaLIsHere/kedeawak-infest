import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "../db/testing";
import { createProduct } from "../data/products";
import { recordStockMovement } from "../data/stock";
import { updateBusinessChannel } from "../data/business";
import { getChannelOverview, processChannelEvent } from "../data/channel-intake";
import { listOrders } from "../data/orders";
import { listCustomers } from "../data/customers";
import type { AIProvider } from "../ai/provider";
import type { TwilioConfig, TwilioMessage } from "./twilio";
import { receiveTwilioMessage } from "./twilio-intake";

const config: TwilioConfig = { accountSid: "AC" + "a".repeat(32), authToken: "test", from: "whatsapp:+14155238886", webhookUrl: "https://warung.ngrok.app/api/channels/whatsapp" };
const image = { bytes: new Uint8Array([255,216,255]), contentType: "image/jpeg" };
function message(id: string, phone: string, body = ""): TwilioMessage {
 return { eventId: id, phoneNumber: phone, body };
}

describe("pesan Twilio sampai data aplikasi", () => {
 let test: TestDatabase;
 let productId: string;
 let orderProvider: AIProvider;
 beforeAll(async () => {
  test = await createTestDatabase();
  await updateBusinessChannel(test.db, test.business.id, { status:"terhubung", packageName:"Twilio Sandbox", phoneNumber:"14155238886", connectedAt:null, quota:null, checkedAt:new Date() });
  const product = await createProduct(test.db, test.business.id, { name:"Beras Uji", unit:"kilogram", salePrice:15000, purchasePrice:12000, minimumStock:2 });
  productId = product.id;
  await recordStockMovement(test.db, test.business.id, {productId,kind:"masuk",quantityChange:30,reason:"Stok awal"});
  orderProvider = { complete: vi.fn(async () => ({ items:[{productId,quantity:2}],unmatched:[] })) };
 });
 afterAll(async () => { await test.close(); });
 it("mengubah audio tanpa Body menjadi transkrip dan order sekali", async () => {
  const download = vi.fn(async () => ({bytes:new Uint8Array([79,103,103,83]),contentType:"audio/ogg"}));
  const transcribe = vi.fn(async () => "Saya mau dua kilogram Beras Uji");
  const input = {...message("voice1","6281200000001"),media:{url:"https://api.twilio.com/media",contentType:"audio/ogg"}};
  const result = await receiveTwilioMessage(test.db,test.business.id,input,config,{download,transcribe,provider:orderProvider});
  expect(result.orderId).toBeDefined();
  const overview = await getChannelOverview(test.db,test.business.id);
  expect(overview.orders.find(o=>o.id===result.orderId)?.origin).toBe("Saya mau dua kilogram Beras Uji");
  const duplicate = await receiveTwilioMessage(test.db,test.business.id,input,config,{download,transcribe,provider:orderProvider});
  expect(duplicate.duplicate).toBe(true);
  expect(transcribe).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledTimes(1);
  expect(overview.orders.find(o=>o.id===result.orderId)?.items[0]?.quantity).toBe(2);
 });
 it("menyimpan kegagalan transkripsi tanpa mengarang pesanan", async () => {
  const result = await receiveTwilioMessage(test.db,test.business.id,{...message("voicefail","6281200000002"),media:{url:"x",contentType:"audio/ogg"}},config,{download:async()=>({bytes:new Uint8Array([1]),contentType:"audio/ogg"}),transcribe:async()=>{throw new Error("secret provider response");},provider:orderProvider});
  expect(result.reply).toContain("ketik");
  expect(result.reply).not.toContain("secret");
  expect(result.orderId).toBeUndefined();
 });
 it("foto tanpa caption terkait hanya dengan pesanan terbuka milik pengirim", async () => {
  const provider: AIProvider = {complete:async()=>({description:"Bukti transfer",amount:30000,date:"2026-10-18",confidence:0.95})};
  const result = await receiveTwilioMessage(test.db,test.business.id,{...message("proof1","6281200000001"),media:{url:"x",contentType:"image/jpeg"}},config,{download:async()=>image,provider});
  expect(result.paymentStatus).toBe("cocok");
  const overview = await getChannelOverview(test.db,test.business.id);
  expect(overview.orders.find(o=>o.id===result.orderId)?.payments[0]?.proofUrl).toBe("data:image/jpeg;base64,/9j/");
 });
 it("foto tanpa pesanan tidak dipasangkan ke pelanggan lain", async () => {
  const provider = {complete:vi.fn()};
  const result = await receiveTwilioMessage(test.db,test.business.id,{...message("proofstranger","6281200000099"),media:{url:"x",contentType:"image/jpeg"}},config,{download:async()=>image,provider});
  expect(result.orderId).toBeUndefined();
  expect(result.reply).toContain("pesanan");
  expect(provider.complete).not.toHaveBeenCalled();
 });
 it("meminta kode saat ada beberapa pesanan dan menghormati kode milik pengirim", async () => {
  const phone = "6281200000003";
  const one = await processChannelEvent(test.db,test.business.id,{eventId:"amb1",phoneNumber:phone,body:"Pesan beras",items:[{productId,quantity:1}]});
  await processChannelEvent(test.db,test.business.id,{eventId:"amb2",phoneNumber:phone,body:"Pesan beras lagi",items:[{productId,quantity:1}]});
  const provider: AIProvider = {complete:async()=>({description:"Bukti transfer",amount:15000,date:"2026-10-18",confidence:0.5})};
  const input = {...message("ambphoto",phone),media:{url:"x",contentType:"image/jpeg"}};
  const ambiguous = await receiveTwilioMessage(test.db,test.business.id,input,config,{download:async()=>image,provider});
  expect(ambiguous.reply).toContain("kode pesanan");
  expect(ambiguous.orderId).toBeUndefined();
  const resolved = await receiveTwilioMessage(test.db,test.business.id,{...input,eventId:"ambresolved",body:one.orderId!.replaceAll("-","")},config,{download:async()=>image,provider});
  expect(resolved.orderId).toBe(one.orderId);
  expect(resolved.paymentStatus).toBe("menunggu");
 });
 it("tidak menerima Twilio saat simulasi aktif atau kanal diputus", async () => {
  const before = (await listCustomers(test.db,test.business.id)).length;
  await updateBusinessChannel(test.db,test.business.id,{status:"terhubung",packageName:"Simulasi web",phoneNumber:null,connectedAt:null,quota:null,checkedAt:new Date()});
  await expect(receiveTwilioMessage(test.db,test.business.id,message("wrongmode","6281200000004","pesan beras"),config,{provider:orderProvider})).rejects.toThrow();
  expect(await listCustomers(test.db,test.business.id)).toHaveLength(before);
  await updateBusinessChannel(test.db,test.business.id,{status:"terputus",packageName:null,phoneNumber:null,connectedAt:null,quota:null,checkedAt:new Date()});
  await expect(receiveTwilioMessage(test.db,test.business.id,message("disconnected","6281200000004","pesan beras"),config,{provider:orderProvider})).rejects.toThrow();
  expect(await listOrders(test.db,test.business.id)).toHaveLength(3);
 });
 it("menolak nomor Sandbox yang berbeda dari nomor tersimpan", async () => {
  await updateBusinessChannel(test.db,test.business.id,{status:"terhubung",packageName:"Twilio Sandbox",phoneNumber:"14155238887",connectedAt:null,quota:null,checkedAt:new Date()});
  await expect(receiveTwilioMessage(test.db,test.business.id,message("wrongphone","6281200000005","pesan beras"),config,{provider:orderProvider})).rejects.toThrow();
  await updateBusinessChannel(test.db,test.business.id,{status:"terhubung",packageName:"Twilio Sandbox",phoneNumber:"14155238886",connectedAt:null,quota:null,checkedAt:new Date()});
 });
 it("teks pesanan menjadi orderan sekali dan balasannya tercatat", async () => {
  const body = "Saya mau dua kilogram Beras Uji";
  const input = message("textorder","6281200000006",body);
  const result = await receiveTwilioMessage(test.db,test.business.id,input,config,{provider:orderProvider});
  expect(result.orderId).toBeDefined();
  const overview = await getChannelOverview(test.db,test.business.id);
  const order = overview.orders.find(item=>item.id===result.orderId);
  expect(order?.origin).toBe(body);
  expect(order?.reply).toContain("Pesanan tercatat");
  const duplicate = await receiveTwilioMessage(test.db,test.business.id,input,config,{provider:orderProvider});
  expect(duplicate.duplicate).toBe(true);
 });
});
