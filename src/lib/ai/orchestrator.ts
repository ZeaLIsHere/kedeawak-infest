import type {Database} from "../db/client";
import {appendMessage,listMessages} from "../data/conversations";
import {getOrStartSession} from "../data/agent-sessions";
import {consumeDailyQuota,setSessionContext,withConversationLock} from "../data/agent-context";
import {decideApproval,findApproval} from "../data/approvals";
import {createTransaction} from "../data/transactions";
import {getBusinessContext} from "./rag";
import {parseReceipt,type Receipt} from "./receipt";
import {getAIProvider,object,type AIProvider} from "./provider";
import {executeTool,toolNames,type ToolResult} from "../tools";
import {formatRupiah} from "../format/currency";
export type AgentInput={conversationId:string;text:string;image?:string};
export type AgentReply={reply:string;mode:"lokal"|"deepseek";awaitingReceipt?:boolean;receipt?:Receipt;approvalId?:string};
export function displayText(text:string){return text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu,"").replace(/[\u2010-\u2015\u2212|~•-]/gu," ").replace(/\s+/g," ").trim();}
function reportText(data:unknown){const d=object(data);return `Penjualan ${formatRupiah(Number(d.sales))}, pengeluaran ${formatRupiah(Number(d.expenses))}, ${Number(d.profit)<0?"rugi":"laba"} ${formatRupiah(Number(d.profit))}.`;}
function describeResult(name:string,result:ToolResult):string{
 if(!result.ok)return result.error;const d=object(result.data);
 if(name==="get_report")return reportText(d);
 if(name==="check_stock")return `${d.name} tersedia ${d.stock} ${d.unit}. Harga ${formatRupiah(Number(d.salePrice))}.`;
 if(name==="create_sale")return `Penjualan ${formatRupiah(Number(d.total))} sudah dicatat. Stok dan laporan diperbarui.`;
 if(name==="create_expense"||name==="create_debt")return `${name==="create_debt"?"Hutang":"Pengeluaran"} ${formatRupiah(Number(d.amount))} sudah dicatat.`;
 if(name==="create_purchase_order")return "Draft pesanan pembelian menunggu keputusan Anda. Balas setujui atau tolak, atau buka Persetujuan.";
 if(name==="business_strategy")return Array.isArray(d.recommendations)?d.recommendations.join(" "):"Periksa laporan penjualan dan stok warung.";
 if(name==="forecast_stock")return d.hasHistory?`${d.name}: penjualan tujuh hari ${d.sold} ${d.unit}, stok pengaman ${d.safetyStock} ${d.unit}, usulan restok ${d.suggestedRestock} ${d.unit}.`:"Belum ada penjualan produk selama tujuh hari. Prediksi kebutuhan belum memiliki dasar historis.";
 if(name==="verify_payment")return d.matches?"Nominal bukti pembayaran sesuai. Ini pemeriksaan nominal, bukan konfirmasi dana diterima bank.":"Bukti pembayaran perlu diperiksa manual. Nominal belum cocok atau keyakinan bacaan rendah.";
 return "Aksi sudah dicatat.";
}
export async function orchestrateAgentMessage(db:Database,businessId:string,input:AgentInput,options:{provider?:AIProvider;dailyLimit?:number}={}):Promise<AgentReply>{
 if(typeof input.text!=="string"||input.text.length>4000||(!input.text.trim()&&!input.image))return {reply:"Tulis pesan atau pilih foto struk terlebih dahulu.",mode:"lokal"};
 return withConversationLock(db,businessId,input.conversationId,async tx=>{
  const session=await getOrStartSession(tx,businessId,input.conversationId);const text=input.text.trim();const answer=text.toLowerCase();
  await appendMessage(tx,businessId,input.conversationId,{sender:"owner",kind:input.image?"image":"text",body:displayText(text)||"Foto struk",mediaUrl:null});
  const finish=async(response:AgentReply)=>{response.reply=displayText(response.reply);await appendMessage(tx,businessId,input.conversationId,{sender:"agent",kind:"text",body:response.reply});return response;};
  if(session.lockStatus==="menunggu_persetujuan"&&session.pendingApprovalId){
   const approval=await findApproval(tx,businessId,session.pendingApprovalId);
   if(approval?.status==="menunggu"){
    if(["setujui","ya","tolak","tidak"].includes(answer)){const decision=["setujui","ya"].includes(answer)?"disetujui":"ditolak";await decideApproval(tx,businessId,approval.id,decision);return finish({reply:decision==="disetujui"?"Pesanan pembelian disetujui. Stok sudah diperbarui.":"Pesanan pembelian ditolak. Stok tetap.",mode:"lokal"});}
    return finish({reply:"Masih ada pesanan pembelian menunggu keputusan. Balas setujui atau tolak, atau buka Persetujuan. Pesan ini tidak dicatat sebagai transaksi baru.",mode:"lokal",approvalId:approval.id});
   }
  }
  const context=typeof session.context==="object"&&session.context!==null?session.context as {pendingReceipt?:Receipt}:{};
  if(context.pendingReceipt){
   if(["ya","setujui","simpan"].includes(answer)){
    const r=context.pendingReceipt;await createTransaction(tx,businessId,{kind:"expense",description:r.description,amount:r.amount,source:"struk",confidence:Math.round(r.confidence*100),occurredAt:new Date(`${r.date}T12:00:00+07:00`)});await setSessionContext(tx,businessId,session.id,{});return finish({reply:`Pengeluaran ${formatRupiah(r.amount)} dari struk sudah dicatat.`,mode:"lokal"});
   }
   if(["tidak","tolak","batal"].includes(answer)){await setSessionContext(tx,businessId,session.id,{});return finish({reply:"Bacaan struk dibatalkan. Ketik atau ucapkan keterangan dan nominal yang benar.",mode:"lokal"});}
   return finish({reply:`Periksa bacaan struk ${formatRupiah(context.pendingReceipt.amount)}. Balas ya untuk menyimpan atau tidak untuk mengisi manual.`,mode:"lokal",receipt:context.pendingReceipt,awaitingReceipt:true});
  }
  const provider=options.provider??getAIProvider();let mode:AgentReply["mode"]=provider?"deepseek":"lokal";
  if(provider&&!await consumeDailyQuota(tx,businessId,options.dailyLimit??100))return finish({reply:"Kuota pemrosesan harian telah tercapai. Gunakan Kasir atau formulir manual untuk mencatat transaksi.",mode:"lokal"});
  if(input.image){const read=await parseReceipt(input.image,provider);if(!read.ok)return finish({reply:read.error,mode});await setSessionContext(tx,businessId,session.id,{pendingReceipt:read.receipt});return finish({reply:`Saya membaca pengeluaran ${formatRupiah(read.receipt.amount)} untuk ${read.receipt.description}. ${read.needsConfirmation?"Keyakinan bacaan di bawah 70 persen. ":""}Periksa nominal dan keterangan. Balas ya untuk menyimpan atau tidak untuk mengisi manual.`,receipt:read.receipt,awaitingReceipt:true,mode});}
  const business=await getBusinessContext(tx,businessId);let name:string|undefined;let args:unknown={};
  if(provider){try{
   const history=(await listMessages(tx,businessId,input.conversationId)).slice(-12).map(m=>({sender:m.sender,body:m.body}));
   const choice=object(await provider.complete({system:`Anda agen warung. Pilih satu tool dengan JSON {"tool":"nama tool","arguments":{}}. Tool tersedia ${toolNames.join(", ")}. check_stock/forecast_stock butuh product_id. create_expense butuh description dan amount. create_sale butuh items [{productId,quantity}],total. create_purchase_order butuh product_id untuk restok. get_report period harian atau mingguan. business_strategy argumen {}. Hanya pilih tool jika pengguna jelas meminta aksi. Bila informasi kurang, kembalikan {"tool":null,"reply":"pertanyaan klarifikasi"}. Jangan mengarang data atau ID. Nominal rupiah bulat. Jangan mengirim WhatsApp tanpa instruksi pemilik.`,prompt:JSON.stringify({context:business,history,message:text})}));
   if(choice.tool===null){return finish({reply:typeof choice.reply==="string"?choice.reply:"Jelaskan produk, jumlah, dan tindakan yang ingin Anda lakukan.",mode});}name=typeof choice.tool==="string"?choice.tool:undefined;args=choice.arguments;
  }catch{mode="lokal";}}
  if(!name){
   mode="lokal";
   if(/laporan|penjualan|laba/.test(answer)){name="get_report";args={period:/minggu/.test(answer)?"mingguan":"harian"};}
   else if(/strategi|saran/.test(answer)){name="business_strategy";args={};}
   else {const product=business.products.find(p=>answer.includes(p.name.toLowerCase()));if(product&&/stok|harga|tersedia/.test(answer)){name="check_stock";args={product_id:product.id};}else if(/jam|buka|tutup/.test(answer))return finish({reply:`Mode lokal. Jam buka ${business.business.opensAt?.slice(0,5)??"belum tercatat"}, jam tutup ${business.business.closesAt?.slice(0,5)??"belum tercatat"}.`,mode});}
   if(!name)return finish({reply:"Mode lokal aktif. Saya dapat membaca laporan, stok, harga produk, dan strategi dari data warung. Untuk mencatat transaksi, gunakan Kasir atau formulir manual. Pembacaan foto memerlukan layanan AI.",mode});
  }
  const result=await executeTool(tx,businessId,name,args,{sessionId:session.id,conversationId:input.conversationId,provider});
  const data=result.ok&&typeof result.data==="object"&&result.data!==null?result.data as {approvalId?:string}:{};
  return finish({reply:(mode==="lokal"?"Mode lokal. ":"")+describeResult(name,result),mode,...(data.approvalId?{approvalId:data.approvalId}:{})});
 });
}


