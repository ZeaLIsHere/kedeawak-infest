import {getAIProvider,object,cleanText,integer,type AIProvider} from "./provider";
export type CartItem={productId:string;quantity:number};
export type ProductDraft={name:string;unit:string;salePrice:number;purchasePrice:number;minimumStock:number;stock:number};
export type ParseFailure={ok:false;error:string};
export async function parseSaleTranscript(text:string,products:readonly {id:string;name:string;stock:number}[],provider:AIProvider|undefined=getAIProvider()):Promise<{ok:true;items:CartItem[];unmatched:string[]}|ParseFailure> {
 if(!provider) return {ok:false,error:"Asisten belum tersedia. Pilih produk secara manual."};
 try {
  if(!text.trim()||text.length>4000) throw Error();
  const result=object(await provider.complete({system:'Ubah pesanan menjadi JSON {"items":[{"productId":"id produk","quantity":2}],"unmatched":["nama tidak dikenal"]}. Hanya gunakan id dalam daftar. Jangan menebak nama barang atau harga.',prompt:JSON.stringify({text,products})}));
  if(!Array.isArray(result.items)||!Array.isArray(result.unmatched)) throw Error();
  const unmatched=result.unmatched.map(v=>cleanText(v)); const amounts=new Map<string,number>();
  for(const raw of result.items){const item=object(raw);const quantity=integer(item.quantity,1); const product=products.find(p=>p.id===item.productId); if(!product){unmatched.push("Produk tidak dikenal");continue;} amounts.set(product.id,(amounts.get(product.id)||0)+quantity);}
  const items=[...amounts].map(([productId,quantity])=>({productId,quantity}));
  if(items.some(i=>i.quantity>(products.find(p=>p.id===i.productId)?.stock??0))) return {ok:false,error:"Jumlah pesanan melebihi stok tersedia. Periksa keranjang secara manual."};
  return {ok:true,items,unmatched};
 }catch{return {ok:false,error:"Pesanan belum dapat dipahami. Pilih produk secara manual."};}
}
export async function parseProductTranscript(text:string,provider:AIProvider|undefined=getAIProvider()):Promise<{ok:true;product:ProductDraft}|ParseFailure>{
 if(!provider)return {ok:false,error:"Asisten belum tersedia. Isi data produk secara manual."};
 try {
  if(!text.trim()||text.length>4000)throw Error();
  const result=object(await provider.complete({system:'Ubah instruksi menjadi JSON {"name":"nama produk","unit":"satuan","salePrice":0,"purchasePrice":0,"minimumStock":0,"stock":0}. Semua kolom wajib ada. Nilai yang tidak disebutkan harus null, jangan dikarang. Harga dalam rupiah bulat. Gunakan bahasa Indonesia tanpa emoji atau tanda hubung.',prompt:text}));
  const product={name:cleanText(result.name,160),unit:cleanText(result.unit,30),salePrice:integer(result.salePrice),purchasePrice:integer(result.purchasePrice),minimumStock:integer(result.minimumStock),stock:integer(result.stock)};
  return {ok:true,product};
 }catch{return {ok:false,error:"Data produk belum lengkap. Isi dan periksa melalui formulir manual."};}
}
