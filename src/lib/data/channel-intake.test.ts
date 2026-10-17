import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, createSecondBusiness, type TestDatabase } from "../db/testing";
import { createProduct, findProduct } from "./products";
import { recordStockMovement } from "./stock";
import { listOrders, findOrder } from "./orders";
import { listTransactions } from "./transactions";
import { listCustomers } from "./customers";
import { processChannelEvent, getChannelOverview } from "./channel-intake";

describe("alur pesan pelanggan", () => {
 let test:TestDatabase;
 let productId:string;
 beforeAll(async()=>{
  test=await createTestDatabase();
  const p=await createProduct(test.db,test.business.id,{name:"Beras Uji",unit:"kilogram",salePrice:15000,purchasePrice:12000,minimumStock:2});
  productId=p.id;
  await recordStockMovement(test.db,test.business.id,{productId,kind:"masuk",quantityChange:20,reason:"Stok awal"});
 });
 afterAll(async()=>{await test.close();});
 it("pesanan dan pembayaran tercatat sekali sampai laporan dan stok berubah",async()=>{
  const order=await processChannelEvent(test.db,test.business.id,{eventId:"order1",phoneNumber:"081200000001",customerName:"Bu Sari",body:"Pesan dua beras",items:[{productId,quantity:2}]});
  expect(order.orderId).toBeDefined();
  expect((await findProduct(test.db,test.business.id,productId))?.stock).toBe(20);
  const again=await processChannelEvent(test.db,test.business.id,{eventId:"order1",phoneNumber:"081200000001",body:"Pesan dua beras",items:[{productId,quantity:2}]});
  expect(again.duplicate).toBe(true);
  expect(await listOrders(test.db,test.business.id)).toHaveLength(1);
  const paid=await processChannelEvent(test.db,test.business.id,{eventId:"pay1",phoneNumber:"081200000001",body:"Bukti transfer",payment:{orderId:order.orderId!,readAmount:30000,confidence:1}});
  expect(paid.paymentStatus).toBe("cocok");
  expect((await findOrder(test.db,test.business.id,order.orderId!))?.status).toBe("selesai");
  expect((await findProduct(test.db,test.business.id,productId))?.stock).toBe(18);
  await processChannelEvent(test.db,test.business.id,{eventId:"pay2",phoneNumber:"081200000001",body:"Bukti yang sama",payment:{orderId:order.orderId!,readAmount:30000,confidence:1}});
  expect((await findProduct(test.db,test.business.id,productId))?.stock).toBe(18);
  expect(await listTransactions(test.db,test.business.id)).toHaveLength(1);
  const overview=await getChannelOverview(test.db,test.business.id);
  expect(overview.orders[0]?.origin).toBe("Pesan dua beras");
  expect(overview.orders[0]?.payments[0]?.status).toBe("cocok");
 });
 it("bukti berbeda dan confidence rendah tidak mengurangi stok",async()=>{
  const order=await processChannelEvent(test.db,test.business.id,{eventId:"order2",phoneNumber:"081200000002",body:"Pesan beras",items:[{productId,quantity:1}]});
  const bad=await processChannelEvent(test.db,test.business.id,{eventId:"paybad",phoneNumber:"081200000002",body:"Bukti",payment:{orderId:order.orderId!,readAmount:1000,confidence:1}});
  expect(bad.paymentStatus).toBe("tidak_cocok");
  const low=await processChannelEvent(test.db,test.business.id,{eventId:"paylow",phoneNumber:"081200000002",body:"Bukti kurang jelas",payment:{orderId:order.orderId!,readAmount:15000,confidence:0.4}});
  expect(low.paymentStatus).toBe("menunggu");
  expect((await findProduct(test.db,test.business.id,productId))?.stock).toBe(18);
 });
 it("menolak referensi lintas warung tanpa mencatat pelanggan atau pesanan",async()=>{
  const other=await createSecondBusiness(test.db);
  await expect(processChannelEvent(test.db,other.id,{eventId:"asing",phoneNumber:"081200000003",body:"Pesan",items:[{productId,quantity:1}]})).rejects.toThrow();
  expect(await listCustomers(test.db,other.id)).toHaveLength(0);
  expect(await listOrders(test.db,other.id)).toHaveLength(0);
 });
 it("menolak bukti milik pelanggan lain",async()=>{
  const order=(await listOrders(test.db,test.business.id))[0]!;
  await expect(processChannelEvent(test.db,test.business.id,{eventId:"payasing",phoneNumber:"081200000009",body:"Bukti asing",payment:{orderId:order.id,readAmount:15000,confidence:1}})).rejects.toThrow();
 });
});
