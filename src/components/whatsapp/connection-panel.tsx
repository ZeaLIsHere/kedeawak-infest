"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {connectChannelAction,disconnectChannelAction} from "@/lib/actions/whatsapp";

export function ConnectionPanel({connected,simulation,phone}:{connected:boolean;simulation:boolean;phone:string|null}){
 const [pending,start]=useTransition();const [message,setMessage]=useState("");const router=useRouter();
 function run(mode:"simulasi"|"twilio"|"disconnect"){start(async()=>{const result=mode==="disconnect"?await disconnectChannelAction():await connectChannelAction(mode);setMessage(result.ok?result.message:result.error);router.refresh();});}
 return <div className="flex flex-col gap-4">
  <p className="font-medium">{connected?(simulation?"Simulasi terhubung":"Twilio Sandbox terhubung"):"Kanal belum terhubung"}</p>
  {phone&&<p className="tabular-nums">{phone}</p>}
  <p className="text-sm text-muted-foreground">Hubungkan secara sadar untuk memproses pesan bisnis warung. Simulasi memakai alur data yang sama dan tidak mengirim pesan ke pelanggan asli.</p>
  <div className="flex flex-wrap gap-3">
   <Button className="min-h-12" disabled={pending} onClick={()=>run("simulasi")}>Hubungkan simulasi</Button>
   <Button variant="outline" className="min-h-12" disabled={pending} onClick={()=>run("twilio")}>Hubungkan Twilio</Button>
   {connected&&<Button variant="outline" className="min-h-12" disabled={pending} onClick={()=>run("disconnect")}>Putuskan koneksi aplikasi</Button>}
  </div>
  {message&&<p role="status" className="text-sm">{message}</p>}
  <details className="rounded-lg border border-border p-4">
   <summary className="cursor-pointer font-medium">Cara menghubungkan Twilio Sandbox</summary>
   <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
    <li>Buka Twilio Console, masuk ke Messaging, lalu buka WhatsApp Sandbox.</li>
    <li>Salin kode join yang ditampilkan Twilio. Setiap peserta mengirim kode itu ke nomor Sandbox dan menunggu konfirmasi join.</li>
    <li>Isi TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, dan WEBHOOK_URL pada konfigurasi server. Atur When a message comes in ke POST /api/channels/whatsapp.</li>
    <li>Jalankan server pada port 3100 dan buka terowongan ngrok. URL WEBHOOK_URL harus sama persis dengan alamat HTTPS publik yang dipasang di Twilio.</li>
    <li>Tekan Hubungkan Twilio. Untuk demonstrasi tanpa layanan luar, tekan Hubungkan simulasi dan gunakan panel pelanggan di bawah.</li>
   </ol>
   <p className="mt-3 text-sm text-muted-foreground">Memutus koneksi aplikasi menghentikan pemrosesan pesan di sini. Peserta tetap berada pada Sandbox Twilio sampai dikeluarkan melalui konsol Twilio.</p>
  </details>
 </div>;
}
