"use client";
import {useEffect,useRef,useState,useTransition} from "react";
import Link from "next/link";
import {Bot,ImagePlus,Send,UserRound,X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {SpeechInput} from "./speech-input";
import {sendAgentMessageAction} from "@/lib/actions/percakapan";
import type {Receipt} from "@/lib/ai/receipt";
import {formatRupiah} from "@/lib/format/currency";
import {formatDate} from "@/lib/format/date";
export type ConversationMessage={id:string;sender:string;body:string;createdAt:string};
export function ConversationPanel({initialMessages,available,initialReceipt}:{initialMessages:ConversationMessage[];available:boolean;initialReceipt?:Receipt}){
 const [messages,setMessages]=useState(initialMessages);const [text,setText]=useState("");const [image,setImage]=useState<string>();const [imageName,setImageName]=useState("");const [error,setError]=useState("");const [pending,startTransition]=useTransition();const [receipt,setReceipt]=useState(initialReceipt);const [mode,setMode]=useState(available?"deepseek":"lokal");const end=useRef<HTMLDivElement>(null);const input=useRef<HTMLTextAreaElement>(null);const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{end.current?.scrollIntoView({block:"nearest"});},[messages]);
 function send(message=text){
  if(pending||(!message.trim()&&!image))return;setError("");
  startTransition(async()=>{try{const result=await sendAgentMessageAction({text:message,...(image?{image}:{})});if(!result.ok){setError(result.error);return;}setMessages(result.messages);setText("");setImage(undefined);setImageName("");if(file.current)file.current.value="";setMode(result.mode);setReceipt(result.awaitingReceipt?result.receipt:undefined);input.current?.focus();}catch{setError("Pesan belum terkirim. Coba kembali.");}});
 }
 async function selectFile(chosen:File|undefined){
  if(!chosen)return;setError("");
  if(!["image/png","image/jpeg","image/webp","image/gif"].includes(chosen.type)||chosen.size>650000){setError("Pilih foto JPG, PNG, WebP, atau GIF berukuran paling besar 650 KB.");if(file.current)file.current.value="";return;}
  const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){setImage(reader.result);setImageName(chosen.name.replace(/[\p{Extended_Pictographic}\u2010-\u2015-]/gu," "));}};reader.onerror=()=>setError("Foto belum dapat dibaca. Pilih kembali fotonya.");reader.readAsDataURL(chosen);
 }
 return <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
  <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed" role="status"><strong>{mode==="lokal"?"Mode lokal aktif":"Asisten AI aktif"}</strong><p className="mt-1 text-muted-foreground">{mode==="lokal"?"Laporan, stok, dan harga dibaca langsung dari data warung. Pembacaan struk memerlukan layanan AI. Catat penjualan melalui Kasir bila layanan belum tersedia.":"Tanya keadaan warung atau minta catat transaksi. Periksa bacaan struk sebelum menyimpan. Pesanan pembelian memerlukan persetujuan Anda."}</p></div>
  <div className="min-h-64 space-y-5 rounded-xl border bg-card p-4 sm:p-6" role="log" aria-label="Riwayat percakapan" aria-live="polite" aria-busy={pending}>
   {messages.length===0?<div className="py-10 text-center"><Bot className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true"/><h2 className="font-semibold">Mulai dari keadaan warung</h2><p className="mt-2 text-sm text-muted-foreground">Tanyakan laporan hari ini, stok produk, atau strategi persediaan.</p></div>:messages.map(m=><article key={m.id} className={`flex gap-3 ${m.sender==="owner"?"flex-row-reverse":""}`}><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">{m.sender==="owner"?<UserRound className="size-4" aria-hidden="true"/>:<Bot className="size-4" aria-hidden="true"/>}</div><div className={`min-w-0 max-w-[85%] rounded-xl px-4 py-3 ${m.sender==="owner"?"bg-primary text-primary-foreground":"bg-muted/60"}`}><p className="mb-1 text-xs font-medium opacity-70">{m.sender==="owner"?"Anda":"Agen warung"}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p></div></article>)}
   {pending&&<p role="status" className="text-sm text-muted-foreground">Sedang memeriksa data warung...</p>}<div ref={end}/>
  </div>
  {receipt&&<section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4" aria-labelledby="receiptTitle"><h2 id="receiptTitle" className="font-semibold">Periksa bacaan struk</h2><dl className="grid gap-2 text-sm"><div><dt className="text-muted-foreground">Keterangan</dt><dd>{receipt.description}</dd></div><div><dt className="text-muted-foreground">Nominal</dt><dd className="font-semibold tabular-nums">{formatRupiah(receipt.amount)}</dd></div><div><dt className="text-muted-foreground">Tanggal</dt><dd>{formatDate(new Date(`${receipt.date}T12:00:00+07:00`))}</dd></div></dl>{receipt.confidence<0.7&&<p className="text-sm text-muted-foreground">Keyakinan bacaan di bawah 70 persen. Pastikan nominal dan keterangan sesuai.</p>}<div className="flex flex-wrap gap-2"><Button className="min-h-11" disabled={pending} onClick={()=>send("ya")}>Simpan pengeluaran</Button><Button variant="outline" className="min-h-11" disabled={pending} onClick={()=>send("tidak")}>Isi ulang manual</Button></div></section>}
  <form className="space-y-3 rounded-xl border bg-card p-4" onSubmit={e=>{e.preventDefault();send();}}><label htmlFor="agent-message" className="text-sm font-medium">Pesan untuk agen</label><textarea ref={input} id="agent-message" value={text} onChange={e=>setText(e.target.value)} maxLength={4000} rows={3} disabled={pending} className="mt-2 w-full resize-y rounded-lg border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-describedby="agentHint"/><p id="agentHint" className="text-xs text-muted-foreground">Contoh: laporan hari ini atau cek stok beras. Foto struk disimpan sebagai pengeluaran setelah Anda menyetujuinya.</p>
   {image&&<div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3 text-sm"><span className="min-w-0 break-all">Foto terpilih: {imageName}</span><Button type="button" variant="ghost" size="icon" aria-label="Hapus foto terpilih" onClick={()=>{setImage(undefined);setImageName("");if(file.current)file.current.value="";}}><X aria-hidden="true"/></Button></div>}
   <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><SpeechInput onTranscript={setText} disabled={pending||!!receipt}/><div><input ref={file} id="receipt-photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={pending||!!receipt} onChange={e=>void selectFile(e.target.files?.[0])}/><Button type="button" variant="outline" className="min-h-11" disabled={pending||!!receipt} onClick={()=>file.current?.click()}><ImagePlus aria-hidden="true"/>Pilih foto struk</Button></div></div><Button type="submit" className="min-h-11" disabled={pending||(!text.trim()&&!image)}><Send aria-hidden="true"/>{pending?"Memproses":"Kirim pesan"}</Button></div>
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </form><p className="text-sm text-muted-foreground">Untuk isian manual, buka <Link className="font-medium text-primary underline underline-offset-4" href="/kasir">Kasir</Link> untuk penjualan atau tulis keterangan pengeluaran beserta nominal pada pesan.</p>
 </div>;
}

