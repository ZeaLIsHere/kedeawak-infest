import {randomUUID,timingSafeEqual} from "node:crypto";
import {revalidatePath} from "next/cache";
import {withCurrentBusiness} from "@/lib/data/server";
import {receiveChannelEvent} from "@/lib/channels/intake";

export const runtime="nodejs";
function authorized(request:Request):boolean{
 const expected=process.env.CHANNEL_WEBHOOK_SECRET?.trim();
 if(!expected)return false;
 const actual=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??new URL(request.url).searchParams.get("key")??"";
 const left=Buffer.from(expected),right=Buffer.from(actual);
 return left.length===right.length&&timingSafeEqual(left,right);
}
export async function POST(request:Request){
 if(!process.env.CHANNEL_WEBHOOK_SECRET?.trim())return Response.json({error:"Penerima pesan belum diatur"},{status:503});
 if(!authorized(request))return Response.json({error:"Akses pesan tidak diizinkan"},{status:401});
 if(Number(request.headers.get("content-length")??0)>1_000_000)return Response.json({error:"Pesan terlalu besar"},{status:413}); // lint-ui-ignore: nama header HTTP internal
 try{
  const raw:unknown=await request.json();
  if(typeof raw!=="object"||raw===null)return Response.json({error:"Pesan belum sesuai"},{status:400});
  const body=raw as Record<string,unknown>;
  if(typeof body.sender!=="string"||typeof body.message!=="string")return Response.json({error:"Pesan belum sesuai"},{status:400});
  const id=typeof body.id==="string"?body.id:typeof body.message_id==="string"?body.message_id:undefined;
  // Payload tanpa identitas hanya diterima sebagai pertanyaan, supaya retry tidak menggandakan order.
  const message=id?body.message:"Pertanyaan pelanggan: "+body.message;
  const payload={eventId:id??randomUUID(),phoneNumber:body.sender,customerName:typeof body.name==="string"?body.name:undefined,body:message};
  const result=await withCurrentBusiness((db,businessId)=>receiveChannelEvent(db,businessId,payload,"fonnte",id!==undefined));
  if(!result)return Response.json({error:"Data warung belum tersedia"},{status:409});
  for(const path of ["/whatsapp","/","/stok","/laporan"])revalidatePath(path);
  // Jangan kembalikan format autoreply penyedia, karena balasan tidak boleh dikirim ke luar.
  return Response.json({accepted:true,duplicate:result.duplicate});
 }catch{return Response.json({error:"Pesan belum dapat diproses"},{status:400});}
}
