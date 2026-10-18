"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { connectChannelAction, disconnectChannelAction } from "@/lib/actions/whatsapp";

export type ConnectionState = {
  readonly connected: boolean;
  readonly phone: string | null;
  readonly packageName: string | null;
  readonly quota: number | null;
  readonly tokenConfigured: boolean;
  readonly webhookConfigured: boolean;
};

export function ConnectionPanel({ state }: { readonly state: ConnectionState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  function run(action: "connect" | "disconnect") {
    setMessage("");
    setFailed(false);

    startTransition(async () => {
      const result =
        action === "connect"
          ? await connectChannelAction("fonnte")
          : await disconnectChannelAction();

      setFailed(!result.ok);
      setMessage(result.ok ? result.message : result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 font-bold">
          {state.connected ? "WhatsApp Fonnte terhubung" : "WhatsApp belum terhubung"}
        </p>
        {state.phone && (
          <span className="text-sm tabular-nums text-muted-foreground">
            Nomor perangkat {state.phone}
          </span>
        )}
      </div>

      {state.connected && (
        <p className="text-sm text-muted-foreground">
          Paket {state.packageName ?? "tidak diketahui"}
          {state.quota === null ? "" : `, sisa kuota ${state.quota}`}.
        </p>
      )}

      {!state.tokenConfigured && (
        <p role="alert" className="text-sm text-destructive">
          FONNTE_TOKEN belum diisi pada .env.local. Isi token perangkat dari dasbor
          Fonnte, lalu restart server.
        </p>
      )}

      {!state.webhookConfigured && (
        <p role="alert" className="text-sm text-destructive">
          FONNTE_WEBHOOK_SECRET belum diisi pada .env.local. Isi secret webhook agar pesan
          pelanggan dapat diterima.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          className="min-h-12"
          disabled={pending || !state.tokenConfigured}
          onClick={() => run("connect")}
        >
          {pending ? (
            <RefreshCw className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {pending
            ? "Memeriksa koneksi"
            : state.connected
              ? "Periksa koneksi"
              : "Hubungkan WhatsApp"}
        </Button>

        {state.connected && (
          <Button
            variant="outline"
            className="min-h-12"
            disabled={pending}
            onClick={() => run("disconnect")}
          >
            <Unplug aria-hidden="true" />
            Putuskan koneksi aplikasi
          </Button>
        )}
      </div>

      {message && (
        <p
          role={failed ? "alert" : "status"}
          className={`text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
