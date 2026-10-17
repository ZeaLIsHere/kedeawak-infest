import {getAIProvider,object,cleanText,integer,type AIProvider} from "./provider";
export type Receipt={description:string;amount:number;date:string;confidence:number};
export type ReceiptResult={ok:true;receipt:Receipt;needsConfirmation:boolean}|{ok:false;error:string;manual:true};
export async function parseReceipt(image:string,provider:AIProvider|undefined=getAIProvider()):Promise<ReceiptResult>{
 const failure={ok:false as const,error:"Foto belum dapat dibaca. Ketik atau ucapkan keterangan dan nominal secara manual.",manual:true as const};
 if(!provider||!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>5_500_000)return failure;
 try {
  const r=object(await provider.complete({system:'Baca struk atau bukti transfer menjadi JSON {"description":"keterangan Indonesia","amount":150000,"date":"2026-10-18","confidence":0.8}. Semua kolom wajib. Confidence 0 sampai 1, nilai harus null jika tidak terbaca. Jangan mengarang. Tanpa emoji atau tanda hubung pada keterangan.',prompt:"Baca nominal, tanggal, dan keterangan foto ini. Tanggal format YYYY-MM-DD.",image})); // lint-ui-ignore: skema JSON dan format tanggal untuk penyedia, bukan teks antarmuka
  const description=cleanText(r.description);const amount=integer(r.amount,1);
  if(typeof r.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||new Date(r.date).toISOString().slice(0,10)!==r.date||typeof r.confidence!=="number"||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1)throw Error();
  return {ok:true,receipt:{description,amount,date:r.date,confidence:r.confidence},needsConfirmation:r.confidence<0.7};
 }catch{return failure;}
}

