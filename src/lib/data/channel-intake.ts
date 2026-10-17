import {formatRupiah} from "../format/currency";
import {formatNumber} from "../format/number";
import { and, eq, ne } from "drizzle-orm";
import type { Database } from "../db/client";
import { messages, orders, transactions } from "../db/schema";
import { findBusiness } from "./business";
import { recordInboundMessage, listMessages, appendMessage } from "./conversations";
import { readCustomerName, readCustomerPhone, findCustomer, findCustomerByPhone } from "./customers";
import { createOrder, findOrderWithItems, listOrders } from "./orders";
import { findProduct, listProducts } from "./products";
import { createPayment, listPaymentsForOrder, recordPaymentReading } from "./payments";
import { recordStockMovement } from "./stock";

export type ChannelEvent = {
  readonly eventId:string;
  readonly phoneNumber:string;
  readonly customerName?:string;
  readonly body:string;
  readonly kind?:"text"|"voice"|"image";
  readonly image?:string;
  readonly reply?:string;
  readonly items?:readonly {productId:string;quantity:number}[];
  readonly payment?:{orderId:string;readAmount?:number;confidence:number;proofUrl?:string};
};
export type ChannelEventResult={duplicate:boolean;orderId?:string;paymentStatus?:"menunggu"|"cocok"|"tidak_cocok";reply:string};
async function prior(db:Database,businessId:string,eventId:string) {
  const [row]=await db.select().from(messages).where(and(eq(messages.businessId,businessId),eq(messages.externalId,eventId))).limit(1);
  return row;
}
export async function hasChannelEvent(db:Database,businessId:string,eventId:string):Promise<boolean> {
  return !!await prior(db,businessId,eventId);
}
export async function listPendingChannelOrders(db:Database,businessId:string,phoneNumber:string) {
  const customer=await findCustomerByPhone(db,businessId,phoneNumber);
  if(!customer)return [];
  return (await listOrders(db,businessId)).filter(order=>order.customerId===customer.id&&order.conversationId!==null&&order.status!=="selesai");
}
export async function processChannelEvent(db:Database,businessId:string,event:ChannelEvent):Promise<ChannelEventResult> {
  if (await prior(db,businessId,event.eventId)) return {duplicate:true,reply:"Pesan ini sudah tercatat"};
  try {
    return await db.transaction(async tx=>{
      const itemInputs=[];
      for (const item of event.items ?? []) {
        const product=await findProduct(tx,businessId,item.productId);
        if (!product || product.archivedAt !== null || !Number.isSafeInteger(item.quantity) || item.quantity<1 || product.stock<item.quantity) throw new Error("Produk atau jumlah pesanan belum sesuai dengan stok");
        itemInputs.push({productId:product.id,quantity:item.quantity,unitPrice:product.salePrice});
      }
      const incoming=await recordInboundMessage(tx,businessId,{channel:"whatsapp",phoneNumber:event.phoneNumber,customerName:event.customerName,body:event.body,kind:event.kind ?? (event.payment?.proofUrl ? "image" : "text"),mediaUrl:event.image ?? event.payment?.proofUrl});
      await tx.update(messages).set({externalId:event.eventId}).where(and(eq(messages.businessId,businessId),eq(messages.id,incoming.message.id)));
      let result:ChannelEventResult={duplicate:false,reply:"Pesan pelanggan sudah tercatat"};
      if (itemInputs.length) {
        const made=await createOrder(tx,businessId,{customerId:incoming.customer.id,conversationId:incoming.conversation.id,items:itemInputs});
        result={duplicate:false,orderId:made.order.id,reply:"Pesanan tercatat dengan total "+formatRupiah(made.order.total)+". Kode pesanan "+made.order.id.replaceAll("-","")+". Kirim bukti pembayaran untuk diperiksa."}; // lint-ui-ignore: pemisah kode pesanan, bukan teks antarmuka
      } else if (event.payment) {
        const {payment}=event;
        const found=await findOrderWithItems(tx,businessId,payment.orderId);
        if (!found || found.order.customerId !== incoming.customer.id) throw new Error("Orderan tidak ditemukan untuk pelanggan ini");
        const status=payment.readAmount === undefined || payment.confidence < 0.7 ? "menunggu" : payment.readAmount === found.order.total ? "cocok" : "tidak_cocok";
        const proof=await createPayment(tx,businessId,{orderId:found.order.id,expectedAmount:found.order.total,proofUrl:payment.proofUrl});
        if (payment.readAmount !== undefined) await recordPaymentReading(tx,businessId,proof.id,{readAmount:payment.readAmount,status});
        if (status === "cocok") {
          const [claimed]=await tx.update(orders).set({status:"selesai"}).where(and(eq(orders.businessId,businessId),eq(orders.id,found.order.id),ne(orders.status,"selesai"))).returning();
          if (claimed) {
            for (const item of found.items) await recordStockMovement(tx,businessId,{productId:item.productId,kind:"keluar",quantityChange:-item.quantity,reason:"Penjualan dari pesan pelanggan"});
            await tx.insert(transactions).values({businessId,customerId:incoming.customer.id,orderId:found.order.id,kind:"sale",description:"Penjualan dari pesan pelanggan",amount:found.order.total,source:"whatsapp",method:"transfer",proofUrl:payment.proofUrl ?? null,confidence:Math.round(payment.confidence * 100)});
          }
        }
        result={duplicate:false,orderId:found.order.id,paymentStatus:status,reply:status==="cocok" ? "Nominal bukti cocok. Penjualan tercatat dan stok sudah diperbarui." : status==="tidak_cocok" ? "Nominal bukti berbeda dari total pesanan. Kirim bukti yang sesuai." : "Bukti belum cukup jelas. Periksa nominal lalu kirim bukti yang terbaca."};
      } else if (event.reply) {
        result.reply=event.reply;
      } else {
        const products=await listProducts(tx,businessId);
        const product=products.find(p=>event.body.toLocaleLowerCase("id-ID").includes(p.name.toLocaleLowerCase("id-ID"))); // lint-ui-ignore: kode bahasa, bukan teks antarmuka
        const business=await findBusiness(tx,businessId);
        result.reply=product ? product.name+" tersedia "+formatNumber(product.stock)+" "+product.unit+", harga "+formatRupiah(product.salePrice)+"." : /jam|buka/i.test(event.body) && business?.opensAt && business.closesAt ? "Warung buka pukul "+business.opensAt.slice(0,5).replace(":",".")+" sampai "+business.closesAt.slice(0,5).replace(":",".") : "Pesan sudah diterima. Sebutkan nama produk untuk memeriksa harga dan stok.";
      }
      await appendMessage(tx,businessId,incoming.conversation.id,{sender:"agent",kind:"text",body:result.reply});
      return result;
    });
  } catch(error) {
    if (await prior(db,businessId,event.eventId)) return {duplicate:true,reply:"Pesan ini sudah tercatat"};
    throw error;
  }
}
export async function getChannelOverview(db:Database,businessId:string) {
  const all=await listOrders(db,businessId);
  const rows=await Promise.all(all.filter(order=>order.conversationId !== null).slice(0,50).map(async order=>{
    const detail=await findOrderWithItems(db,businessId,order.id);
    const customer=order.customerId ? await findCustomer(db,businessId,order.customerId) : undefined;
    const history=order.conversationId ? await listMessages(db,businessId,order.conversationId) : [];
    const origin=history.filter(message=>message.sender==="customer" && message.createdAt<=order.createdAt).at(-1)?.body ?? "Pesan asal belum tercatat";
    const reply=history.filter(message=>message.sender==="agent").at(-1)?.body ?? "Belum ada balasan";
    const payments=await listPaymentsForOrder(db,businessId,order.id);
    const items=await Promise.all((detail?.items ?? []).map(async item=>({...item,name:(await findProduct(db,businessId,item.productId))?.name ?? "Produk dalam riwayat"})));
    return {...order,items,payments,origin,reply,customerName:customer ? readCustomerName(customer) ?? "Pelanggan warung" : "Data pelanggan dihapus",phone:customer ? readCustomerPhone(customer) : null};
  }));
  return {orders:rows.sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())};
}
