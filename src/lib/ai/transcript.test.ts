import { describe, expect, it } from "vitest";
import { parseSaleTranscript, parseProductTranscript } from "./transcript";
import { parseReceipt } from "./receipt";
const provider = (value: unknown) => ({ complete: async () => value });
const products = [{ id: "p1", name: "Beras", stock: 5 }];
describe("penafsiran masukan", () => {
 it("memakai produk yang dikenal dan melaporkan produk asing", async () => {
  expect(await parseSaleTranscript("dua beras dan kopi", products, provider({items:[{productId:"p1",quantity:2},{productId:"asing",quantity:1}],unmatched:["kopi"]}))).toEqual({ok:true,items:[{productId:"p1",quantity:2}],unmatched:["kopi","Produk tidak dikenal"]});
 });
 it("menolak jumlah pecahan dari model", async () => {
  expect((await parseSaleTranscript("beras", products, provider({items:[{productId:"p1",quantity:1.5}],unmatched:[]}))).ok).toBe(false);
 });
 it("menggabungkan produk ganda dan menolak jumlah melebihi stok", async () => {
  expect((await parseSaleTranscript("beras",products,provider({items:[{productId:"p1",quantity:3},{productId:"p1",quantity:3}],unmatched:[]}))).ok).toBe(false);
 });
 it("menolak produk yang belum lengkap",async()=>{
  expect((await parseProductTranscript("sabun",provider({name:"Sabun",unit:"botol",salePrice:8000}))).ok).toBe(false);
 });
 it("menghasilkan usulan produk lengkap tanpa menyimpannya",async()=>{
  const product={name:"Sabun",unit:"botol",salePrice:8000,purchasePrice:6000,stock:12,minimumStock:3};
  expect(await parseProductTranscript("sabun",provider(product))).toEqual({ok:true,product});
 });
 it("meminta konfirmasi struk dengan keyakinan rendah",async()=>{
  const result=await parseReceipt("data:image/png;base64,YQ==",provider({description:"Belanja warung",amount:150000,date:"2026-10-18",confidence:0.6}));
  expect(result).toMatchObject({ok:true,needsConfirmation:true,receipt:{amount:150000}});
 });
 it("meminta isian manual saat struk tidak sah",async()=>{
  expect(await parseReceipt("data:image/png;base64,YQ==",provider({description:"Belanja",amount:-10,date:"2026-02-31",confidence:2}))).toMatchObject({ok:false,manual:true});
 });
 it("tidak meneruskan galat penyedia yang berisi rahasia",async()=>{
  const result=await parseProductTranscript("sabun",{complete:async()=>{throw Error("secret token");}});
  expect(result).toMatchObject({ok:false}); expect(JSON.stringify(result)).not.toContain("secret");
 });
});
