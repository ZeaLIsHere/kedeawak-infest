import {formatNumber} from "@/lib/format/number";
import {Suspense} from "react";
import {CardError} from "@/components/shell/card-error";
import {PageHeader} from "@/components/shell/page-header";
import {SectionCard} from "@/components/shell/section-card";
import {NoWarungState} from "@/components/shell/no-warung-state";
import {ConnectionPanel} from "@/components/whatsapp/connection-panel";
import {MessageSimulator} from "@/components/whatsapp/message-simulator";
import {CustomerControls} from "@/components/whatsapp/customer-controls";
import {withCurrentBusiness} from "@/lib/data/server";
import {findBusiness} from "@/lib/data/business";
import {listProducts} from "@/lib/data/products";
import {listCustomers,readCustomerName,readCustomerPhone} from "@/lib/data/customers";
import {getChannelOverview} from "@/lib/data/channel-intake";
import {safeChannelText} from "@/lib/channels/fonnte";
import {formatRupiah} from "@/lib/format/currency";

async function ChannelContent(){
 const data=await withCurrentBusiness(async(db,id)=>({business:await findBusiness(db,id),products:await listProducts(db,id),overview:await getChannelOverview(db,id),customers:(await listCustomers(db,id)).map(c=>({id:c.id,name:readCustomerName(c)??"Pelanggan warung",phone:readCustomerPhone(c)}))}));
 if(!data?.business)return <NoWarungState/>;
 const connected=data.business.channelStatus==="terhubung";
 const statuses={baru:"Baru",dikonfirmasi:"Dikonfirmasi",selesai:"Selesai"};
 const paymentStatuses={menunggu:"Menunggu pemeriksaan",cocok:"Nominal cocok",tidak_cocok:"Nominal berbeda"};
 return <div className="flex flex-col gap-section">
  <SectionCard title="Koneksi nomor"><ConnectionPanel connected={connected} simulation={data.business.channelPackage==="Simulasi web"} phone={data.business.channelPhoneNumber}/></SectionCard>
  <SectionCard title="Panel pelanggan"><MessageSimulator connected={connected} products={data.products.map(p=>({id:p.id,name:safeChannelText(p.name),stock:p.stock}))} orders={data.overview.orders.map(o=>({id:o.id,phone:o.phone,customerName:o.customerName,total:o.total}))}/></SectionCard>
  <SectionCard title="Orderan pelanggan">
   {!data.overview.orders.length?<p className="text-sm text-muted-foreground">Belum ada orderan. Kirim pesanan dari panel pelanggan untuk memulai demonstrasi.</p>:<div className="flex flex-col gap-4">{data.overview.orders.map(order=><article key={order.id} data-testid="channel-order" data-order-id={order.id} data-total={order.total} className="min-w-0 rounded-lg border border-border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{safeChannelText(order.customerName)}</h3><p className="text-sm tabular-nums">{order.phone}</p></div><div className="text-right"><p className="font-medium tabular-nums">{formatRupiah(order.total)}</p><p className="text-sm">{statuses[order.status]}</p></div></div>
    <ul className="mt-3 space-y-1 text-sm">{order.items.map(item=><li key={item.id}>{safeChannelText(item.name)+" sebanyak "+formatNumber(item.quantity)}</li>)}</ul>
    <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted-foreground">Pesan asal</dt><dd className="break-words">{safeChannelText(order.origin)}</dd></div><div><dt className="text-muted-foreground">Balasan tercatat</dt><dd className="break-words">{safeChannelText(order.reply)}</dd></div></dl>
    <div className="mt-3 flex flex-col gap-2 text-sm">{!order.payments.length?<p className="text-muted-foreground">Belum ada bukti pembayaran</p>:order.payments.map(payment=><div key={payment.id} className="rounded-lg bg-muted p-3"><p className="font-medium">{paymentStatuses[payment.status]}</p><p>{"Nominal pesanan "+formatRupiah(payment.expectedAmount)}</p>{payment.readAmount!==null&&<p>{"Nominal terbaca "+formatRupiah(payment.readAmount)}</p>}</div>)}</div>
   </article>)}</div>}
  </SectionCard>
  <SectionCard title="Data pelanggan"><CustomerControls customers={data.customers.map(c=>({...c,name:safeChannelText(c.name)}))}/></SectionCard>
 </div>;
}
export default function WhatsappPage(){return <><PageHeader title="Integrasi WhatsApp" description="Hubungkan kanal bisnis dan periksa pesanan serta bukti pembayaran pelanggan."/><div className="mx-auto w-full max-w-content p-page"><CardError title="Integrasi WhatsApp"><Suspense fallback={<p className="text-sm text-muted-foreground">Memuat kanal bisnis</p>}><ChannelContent/></Suspense></CardError></div></>;}
