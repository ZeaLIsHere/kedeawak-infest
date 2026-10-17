import type {Database} from "../db/client";
import {findProduct,listLowStockProducts,listProducts} from "../data/products";
import {createSale} from "../data/sales";
import {createTransaction} from "../data/transactions";
import {findCustomer} from "../data/customers";
import {createPurchaseOrder} from "../data/purchase-orders";
import {createApproval,draftFromStockAlert} from "../data/approvals";
import {appendMessage,findConversation,findConversationByPhone} from "../data/conversations";
import {listStockMovements} from "../data/stock";
import {summarizeDay,summarizeWeek} from "../data/reports";
import {recordToolInvocation,completeToolInvocation} from "../data/tool-invocations";
import {lockSession} from "../data/agent-sessions";
import {cleanText,integer,object,type AIProvider} from "../ai/provider";
import {parseReceipt} from "../ai/receipt";
import {formatRupiah} from "../format/currency";
export const toolNames=["check_stock","create_sale","create_expense","create_debt","create_purchase_order","send_whatsapp","verify_payment","get_report","forecast_stock","business_strategy"] as const;
export type ToolName=typeof toolNames[number];
export type ToolContext={sessionId?:string;conversationId?:string;provider?:AIProvider;at?:Date};
export type ToolResult={ok:true;data:unknown}|{ok:false;error:string};
function text(v:unknown){return cleanText(v);}
async function activeProduct(db:Database,businessId:string,id:unknown){if(typeof id!=="string")throw Error();const p=await findProduct(db,businessId,id);if(!p||p.archivedAt)throw Error();return p;}
export async function forecastStock(db:Database,businessId:string,productId:string,at=new Date()){
 const p=await activeProduct(db,businessId,productId);const from=new Date(at.getTime()-7*86400000);
 const movements=await listStockMovements(db,businessId,p.id);const history=movements.filter(m=>m.kind==="keluar"&&m.createdAt>=from&&m.createdAt<=at);
 const sold=history.reduce((n,m)=>n-m.quantityChange,0);const dailyAverage=sold/7;const safetyStock=Math.max(p.minimumStock,Math.ceil(dailyAverage*2));
 return {productId:p.id,name:p.name,unit:p.unit,stock:p.stock,days:7,sold,dailyAverage,safetyStock,daysRemaining:dailyAverage>0?Math.floor(p.stock/dailyAverage):null,suggestedRestock:Math.max(0,Math.ceil(dailyAverage*7+safetyStock-p.stock)),hasHistory:sold>0};
}
export async function executeTool(db:Database,businessId:string,name:string,args:unknown,context:ToolContext={}):Promise<ToolResult>{
 const invocation=await recordToolInvocation(db,businessId,{sessionId:context.sessionId,toolName:name,arguments:args});
 let result:ToolResult;
 try {result={ok:true,data:await perform(db,businessId,name,args,context)};}catch{result={ok:false,error:"Aksi belum dapat dijalankan. Periksa isian, ketersediaan produk, dan stok warung."};}
 await completeToolInvocation(db,businessId,invocation.id,{failed:!result.ok,result});return result;
}
async function perform(db:Database,businessId:string,name:string,args:unknown,c:ToolContext):Promise<unknown>{
 const a=object(args);
 switch(name){
 case "check_stock":{const p=await activeProduct(db,businessId,a.product_id);return {productId:p.id,name:p.name,stock:p.stock,unit:p.unit,salePrice:p.salePrice,minimumStock:p.minimumStock};}
 case "create_sale":{
  if(!Array.isArray(a.items)||!a.items.length||a.items.length>100)throw Error();
  const items=await Promise.all(a.items.map(async raw=>{const i=object(raw);const p=await activeProduct(db,businessId,i.productId);return {productId:p.id,quantity:integer(i.quantity,1),price:p.salePrice};}));
  const total=items.reduce((n,i)=>n+i.quantity*i.price,0);if(a.total!==undefined&&integer(a.total)!==total)throw Error();
  return createSale(db,businessId,{items,method:"tunai",cashReceived:total});
 }
 case "create_expense":return createTransaction(db,businessId,{kind:"expense",description:text(a.description),amount:integer(a.amount,1),source:"app"});
 case "create_debt":{const customer=await findCustomer(db,businessId,typeof a.customer==="string"?a.customer:"");if(!customer)throw Error();return createTransaction(db,businessId,{kind:"debt",description:"Hutang pelanggan",amount:integer(a.amount,1),source:"app",customerId:customer.id});}
 case "create_purchase_order":{
  let approval;
  if(typeof a.product_id==="string")approval=await draftFromStockAlert(db,businessId,a.product_id);
  else {
   const supplier=text(a.supplier);if(!Array.isArray(a.items)||!a.items.length||a.items.length>100)throw Error();
   const items=await Promise.all(a.items.map(async raw=>{const i=object(raw);const p=await activeProduct(db,businessId,i.productId);return {productId:p.id,quantity:integer(i.quantity,1),estimatedPrice:p.purchasePrice};}));
   approval=await db.transaction(async tx=>{const po=await createPurchaseOrder(tx as unknown as Database,businessId,{supplierName:supplier,items});return createApproval(tx as unknown as Database,businessId,{purchaseOrderId:po.order.id,summary:`Pesanan pembelian dari ${supplier}`});});
  }
  if(c.sessionId)await lockSession(db,businessId,c.sessionId,approval.id);
  return {approvalId:approval.id,status:approval.status,summary:approval.summary};
 }
 case "send_whatsapp":{
  if(!c.conversationId||typeof a.phone!=="string")throw Error();const target=await findConversationByPhone(db,businessId,a.phone);const current=await findConversation(db,businessId,c.conversationId);
  if(!target||target.id!==c.conversationId||current?.channel!=="whatsapp")throw Error();
  const message=await appendMessage(db,businessId,target.id,{sender:"agent",kind:"text",body:text(a.message)});return {messageId:message.id,simulated:true};
 }
 case "verify_payment":{
  const expected=integer(a.expected_amount,1);if(typeof a.image_url!=="string")throw Error();const read=await parseReceipt(a.image_url,c.provider);
  if(!read.ok)throw Error();return {amount:read.receipt.amount,expectedAmount:expected,confidence:read.receipt.confidence,matches:read.receipt.amount===expected&&!read.needsConfirmation,needsConfirmation:read.needsConfirmation};
 }
 case "get_report":{if(a.period!=="harian"&&a.period!=="mingguan")throw Error();return a.period==="harian"?summarizeDay(db,businessId,c.at):summarizeWeek(db,businessId,c.at);}
 case "forecast_stock":{if(typeof a.product_id!=="string")throw Error();return forecastStock(db,businessId,a.product_id,c.at);}
 case "business_strategy":{
  if(Object.keys(a).length)throw Error();const [summary,low,products]=await Promise.all([summarizeWeek(db,businessId,c.at),listLowStockProducts(db,businessId),listProducts(db,businessId)]);
  const recommendations=[];if(low.length)recommendations.push(`Periksa persediaan ${low.map(p=>p.name).join(", ")} dan ajukan pesanan pembelian sesuai kebutuhan.`);if(summary.expenses>summary.sales)recommendations.push("Pengeluaran melebihi penjualan. Periksa rincian belanja pada laporan sebelum menambah persediaan.");if(!summary.transactionCount)recommendations.push("Catat transaksi terlebih dahulu agar strategi memiliki dasar penjualan.");if(!recommendations.length)recommendations.push(`Pantau margin dan perputaran ${products.length} produk aktif melalui laporan. Penjualan minggu ini ${formatRupiah(summary.sales)}.`);
  return {summary,recommendations};
 }
 default:throw Error();
 }
}

