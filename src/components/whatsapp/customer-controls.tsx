"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {deleteChannelCustomerAction} from "@/lib/actions/whatsapp";

export function CustomerControls({customers}:{customers:{id:string;name:string;phone:string}[]}){
 const [selected,setSelected]=useState<string|null>(null);const [message,setMessage]=useState("");const [pending,start]=useTransition();const router=useRouter();
 function remove(){if(!selected)return;start(async()=>{const result=await deleteChannelCustomerAction(selected);setMessage(result.ok?result.message:result.error);if(result.ok){setSelected(null);router.refresh();}});}
 return <div className="flex flex-col gap-4">
  {customers.length===0?<p className="text-sm text-muted-foreground">Belum ada data pelanggan yang tersimpan.</p>:customers.map(customer=><div key={customer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><div><p className="font-medium">{customer.name}</p><p className="text-sm tabular-nums text-muted-foreground">{customer.phone}</p></div><Button variant="outline" className="min-h-12" aria-label={"Hapus data "+customer.name} onClick={()=>setSelected(customer.id)}>Hapus data</Button></div>)}
  {selected&&<div role="group" aria-label="Konfirmasi hapus data pelanggan" className="rounded-lg border border-border p-4"><p className="text-sm">Nama dan nomor pelanggan akan dihapus. Catatan transaksi warung tetap disimpan tanpa identitas pelanggan.</p><div className="mt-3 flex gap-3"><Button variant="destructive" className="min-h-12" disabled={pending} onClick={remove}>Konfirmasi hapus</Button><Button variant="outline" className="min-h-12" disabled={pending} onClick={()=>setSelected(null)}>Batal</Button></div></div>}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </div>;
}
