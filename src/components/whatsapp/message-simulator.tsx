"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {receiveSimulatedMessage} from "@/lib/actions/whatsapp";
type Product={id:string;name:string;stock:number};
type Order={id:string;phone:string|null;customerName:string;total:number};
const selectClass="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"; // lint-ui-ignore: kumpulan kelas CSS internal
export function MessageSimulator({products,orders,connected}:{products:Product[];orders:Order[];connected:boolean}){
 const [phone,setPhone]=useState("");const [customerName,setCustomerName]=useState("");
 const [mode,setMode]=useState("order");const [key,setKey]=useState(()=>crypto.randomUUID());const [message,setMessage]=useState("");const [pending,start]=useTransition();const router=useRouter();
 function submit(form:FormData){form.set("eventId",key);start(async()=>{const result=await receiveSimulatedMessage(form);setMessage(result.ok?result.message:result.error);if(result.ok){setKey(crypto.randomUUID());router.refresh();}});}
 return <form action={submit} className="flex flex-col gap-4">
  <p className="text-sm text-muted-foreground">Anda berperan sebagai pelanggan pada panel simulasi. Pesanan dan bukti diproses ke basis data, tanpa pengiriman pesan keluar.</p>
  {!connected&&<p role="status">Hubungkan simulasi atau nomor warung terlebih dahulu.</p>}
  <div className="grid gap-4 md:grid-cols-2">
   <label className="flex flex-col gap-2 text-sm font-medium">Jenis pesan<select name="mode" value={mode} onChange={e=>setMode(e.target.value)} className={selectClass}><option value="order">Pesanan</option><option value="payment">Bukti pembayaran</option><option value="question">Pertanyaan</option></select></label>
   <label className="flex flex-col gap-2 text-sm font-medium">Nomor pelanggan<Input name="phone" inputMode="tel" required minLength={8} maxLength={15} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
   <label className="flex flex-col gap-2 text-sm font-medium">Nama pelanggan<Input name="name" maxLength={100} value={customerName} onChange={event=>setCustomerName(event.target.value)}/></label>
  </div>
  <label className="flex flex-col gap-2 text-sm font-medium">Pesan pelanggan<textarea name="body" required maxLength={4000} className={selectClass+" min-h-24 py-3"}/></label>
  {mode==="order"&&<div className="grid gap-4 md:grid-cols-2">
   <label className="flex flex-col gap-2 text-sm font-medium">Produk pesanan<select name="productId" className={selectClass}>{products.filter(p=>p.stock>0).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="flex flex-col gap-2 text-sm font-medium">Jumlah pesanan<Input name="quantity" type="number" required min={1} step={1} defaultValue={1}/></label>
  </div>}
  {mode==="payment"&&<div className="flex flex-col gap-4">
   <label className="flex flex-col gap-2 text-sm font-medium">Orderan pembayaran<select name="orderId" required className={selectClass}>{orders.map((order,index)=><option key={order.id} value={order.id}>{order.customerName+" "+String(index+1)}</option>)}</select></label>
   <label className="flex flex-col gap-2 text-sm font-medium">Nominal bukti simulasi<Input name="amount" type="number" min={0} step={1}/></label>
   <label className="flex flex-col gap-2 text-sm font-medium">Foto bukti pembayaran<Input name="proof" type="file" accept="image/png,image/jpeg,image/webp"/></label>
   <p className="text-sm text-muted-foreground">Nominal yang Anda isi adalah data bukti untuk simulasi. Kosongkan nominal untuk membaca foto lewat asisten. Ini pencocokan nominal dan tidak memeriksa rekening bank.</p>
  </div>}
  <Button type="submit" disabled={pending||!connected||(mode==="order"&&products.every(p=>p.stock===0))||(mode==="payment"&&orders.length===0)} className="min-h-12 self-start">{pending?"Sedang memproses":"Kirim pesan simulasi"}</Button>
  {message&&<p role="status" className="text-sm">{message}</p>}
 </form>;
}
