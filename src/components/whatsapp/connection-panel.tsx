"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { connectChannelAction, disconnectChannelAction } from "@/lib/actions/whatsapp";

export function ConnectionPanel({
  connected,
  simulation,
  fonnte,
  phone,
}: {
  connected: boolean;
  simulation: boolean;
  fonnte: boolean;
  phone: string | null;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  function run(mode: "simulasi" | "fonnte" | "disconnect") {
    start(async () => {
      const result =
        mode === "disconnect"
          ? await disconnectChannelAction()
          : await connectChannelAction(mode);
      setMessage(result.ok ? result.message : result.error);
      router.refresh();
    });
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="font-medium">
        {connected
          ? simulation
            ? "Simulasi web terhubung"
            : fonnte
              ? "WhatsApp Fonnte terhubung"
              : "Kanal terhubung"
          : "Kanal belum terhubung"}
      </p>
      {phone && <p className="tabular-nums">Nomor perangkat {phone}</p>}
      <p className="text-sm text-muted-foreground">
        Hubungkan perangkat Fonnte agar pesan pelanggan masuk ke aplikasi dan dibalas
        otomatis. Simulasi memakai alur data yang sama dan tidak mengirim pesan ke
        pelanggan asli.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-12" disabled={pending} onClick={() => run("fonnte")}>
          Hubungkan WhatsApp
        </Button>
        <Button
          variant="outline"
          className="min-h-12"
          disabled={pending}
          onClick={() => run("simulasi")}
        >
          Hubungkan simulasi
        </Button>
        {connected && (
          <Button
            variant="outline"
            className="min-h-12"
            disabled={pending}
            onClick={() => run("disconnect")}
          >
            Putuskan koneksi aplikasi
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-medium">
          Cara menghubungkan Fonnte
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Buka dasbor Fonnte, tambahkan perangkat, lalu sambungkan dengan memindai kode
            QR memakai WhatsApp warung.
          </li>
          <li>
            Salin Token perangkat dari menu perangkat Fonnte, lalu isi FONNTE_TOKEN pada
            konfigurasi server.
          </li>
          <li>
            Isi alamat webhook perangkat Fonnte ke alamat publik aplikasi ini, arah POST
            /api/channels/fonnte, beserta kunci FONNTE_WEBHOOK_SECRET sebagai parameter
            key.
          </li>
          <li>
            Aktifkan Autoread pada perangkat Fonnte, lalu biarkan Personal dan Group mati
            agar balasan hanya dikirim melalui aplikasi ini.
          </li>
          <li>
            Tekan Hubungkan WhatsApp. Perangkat harus berstatus terhubung di dasbor
            Fonnte.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Balasan pelanggan dibuat oleh model DeepSeek dari data warung dan dikirim
          kembali melalui perangkat Fonnte.
        </p>
      </details>
    </div>
  );
}
