"use server";
import { revalidatePath } from "next/cache";
import { withCurrentBusiness } from "../data/server";
import { updateBusinessChannel } from "../data/business";
import { deleteCustomerData } from "../data/customers";
import { receiveChannelEvent } from "../channels/intake";
import { readFonnteProfile } from "../channels/fonnte";

type Result={ok:true;message:string}|{ok:false;error:string};
function refresh(){for(const path of ["/whatsapp","/","/stok","/laporan"]) revalidatePath(path);}
export async function connectChannelAction(mode:"simulasi"|"fonnte"):Promise<Result>{
 if(mode!=="simulasi"&&mode!=="fonnte")return {ok:false,error:"Pilihan koneksi belum sesuai"};
 try{
  const result=await withCurrentBusiness(async(db,id)=>{
   const profile=mode==="simulasi" ? {status:"terhubung" as const,phoneNumber:null,connectedAt:new Date(),packageName:"Simulasi web",quota:null,checkedAt:new Date()} : await readFonnteProfile(process.env.FONNTE_TOKEN ?? "");
   await updateBusinessChannel(db,id,profile);
   return profile.status;
  });
  if(!result)return {ok:false,error:"Data warung belum tersedia"};
  refresh();return {ok:true,message:result==="terhubung"?"Koneksi aplikasi sudah terhubung":"Nomor belum terhubung. Periksa perangkat di Fonnte."};
 }catch{return {ok:false,error:"Koneksi belum dapat diperiksa. Periksa token perangkat dan jaringan, atau gunakan simulasi."};}
}
export async function disconnectChannelAction():Promise<Result>{
 try{
  const result=await withCurrentBusiness(async(db,id)=>updateBusinessChannel(db,id,{status:"terputus",phoneNumber:null,connectedAt:null,packageName:null,quota:null,checkedAt:new Date()}));
  if(!result)return {ok:false,error:"Data warung belum tersedia"};
  refresh();return {ok:true,message:"Koneksi aplikasi diputus. Pesan masuk tidak diproses sampai Anda menghubungkan lagi."};
 }catch{return {ok:false,error:"Koneksi aplikasi belum dapat diputus. Coba lagi."};}
}
export async function receiveSimulatedMessage(form:FormData):Promise<Result>{
 try{
  const mode=form.get("mode");
  if(!["order","payment","question"].includes(String(mode)))return {ok:false,error:"Jenis pesan belum sesuai"};
  const base={eventId:form.get("eventId"),phoneNumber:form.get("phone"),customerName:form.get("name"),body:form.get("body")};
  let proofUrl:string|undefined;
  const proof=form.get("proof");
  if(proof instanceof File&&proof.size){
   if(proof.size>3_000_000||!["image/png","image/jpeg","image/webp"].includes(proof.type))return {ok:false,error:"Foto maksimal 3 MB dengan format PNG, JPEG, atau WebP"};
   proofUrl="data:"+proof.type+";base64,"+Buffer.from(await proof.arrayBuffer()).toString("base64");
  }
  const rawAmount=form.get("amount");
  const payload={...base,...(mode==="order"?{items:[{productId:form.get("productId"),quantity:Number(form.get("quantity"))}]}:{}),...(mode==="payment"?{payment:{orderId:form.get("orderId"),...(rawAmount!==""&&rawAmount!==null?{readAmount:Number(rawAmount),confidence:1}:{}),...(proofUrl?{proofUrl}:{})}}:{})};
  if(mode==="payment"&&!proofUrl&&(rawAmount===""||rawAmount===null))return {ok:false,error:"Isi nominal bukti simulasi atau pilih foto bukti"};
  const result=await withCurrentBusiness((db,id)=>receiveChannelEvent(db,id,payload,"simulasi"));
  if(!result)return {ok:false,error:"Data warung belum tersedia"};
  refresh();return {ok:true,message:result.reply};
 }catch{return {ok:false,error:"Pesan belum dapat disimpan. Periksa koneksi, produk, stok, nomor pelanggan, dan orderan yang dipilih."};}
}
export async function deleteChannelCustomerAction(customerId:string):Promise<Result>{
 try{
  const removed=await withCurrentBusiness((db,id)=>deleteCustomerData(db,id,customerId));
  if(!removed)return {ok:false,error:"Pelanggan tidak ditemukan pada warung ini"};
  refresh();return {ok:true,message:"Data pelanggan sudah dihapus"};
 }catch{return {ok:false,error:"Data pelanggan belum dapat dihapus. Coba lagi."};}
}
