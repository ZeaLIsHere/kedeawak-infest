"use client";
import { ImagePlus, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendAgentMessageAction } from "@/lib/actions/percakapan";
import type { Receipt } from "@/lib/ai/receipt";
import { formatRupiah } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";
import { SpeechInput } from "./speech-input";
export type ConversationMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};
export function ConversationPanel({
  initialMessages,
  available,
  initialReceipt,
}: {
  initialMessages: ConversationMessage[];
  available: boolean;
  initialReceipt?: Receipt;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [receipt, setReceipt] = useState(initialReceipt);
  const [mode, setMode] = useState(available ? "deepseek" : "lokal");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  function send(message = text) {
    if (pending || (!message.trim() && !image)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await sendAgentMessageAction({
          text: message,
          ...(image ? { image } : {}),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessages(result.messages);
        setText("");
        setImage(undefined);
        setImageName("");
        if (file.current) file.current.value = "";
        setMode(result.mode);
        setReceipt(result.awaitingReceipt ? result.receipt : undefined);
        input.current?.focus();
      } catch {
        setError("Pesan belum terkirim. Coba kembali.");
      }
    });
  }
  async function selectFile(chosen: File | undefined) {
    if (!chosen) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(chosen.type) ||
      chosen.size > 650000
    ) {
      setError("Pilih foto JPG, PNG, WebP, atau GIF berukuran paling besar 650 KB.");
      if (file.current) file.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setImageName(
          chosen.name.replace(/[\p{Extended_Pictographic}\u2010-\u2015-]/gu, " "),
        );
      }
    };
    reader.onerror = () => setError("Foto belum dapat dibaca. Pilih kembali fotonya.");
    reader.readAsDataURL(chosen);
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div
        className="rounded-md border-2 border-border bg-info-surface p-4 text-sm font-medium leading-relaxed shadow-control"
        role="status"
      >
        <strong>{mode === "lokal" ? "Mode lokal aktif" : "Asisten AI aktif"}</strong>
        <p className="mt-1 text-muted-foreground">
          {mode === "lokal"
            ? "Laporan, stok, dan harga dibaca langsung dari data warung. Pembacaan struk memerlukan layanan AI. Catat penjualan melalui Kasir bila layanan belum tersedia."
            : "Tanya keadaan warung atau minta catat transaksi. Periksa bacaan struk sebelum menyimpan. Pesanan pembelian memerlukan persetujuan Anda."}
        </p>
      </div>
      <div
        className="min-h-64 space-y-5 rounded-md border-2 border-border bg-card p-4 shadow-card sm:p-6"
        role="log"
        aria-label="Riwayat percakapan"
        aria-live="polite"
        aria-busy={pending}
      >
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <h2 className="font-bold">Mulai dari keadaan warung</h2>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Tanyakan laporan hari ini, stok produk, atau strategi persediaan.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className={`flex ${m.sender === "owner" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`min-w-0 max-w-[85%] rounded-md border-2 border-border px-4 py-3 text-foreground ${
                  m.sender === "owner" ? "bg-primary" : "bg-secondary"
                }`}
              >
                <p className="mb-1 text-xs font-bold">
                  {m.sender === "owner" ? "Anda" : "Agen warung"}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.body}
                </p>
              </div>
            </article>
          ))
        )}
        {pending && (
          <p role="status" className="text-sm font-medium text-muted-foreground">
            Sedang memeriksa data warung...
          </p>
        )}
        <div ref={end} />
      </div>
      {receipt && (
        <section
          className="space-y-3 rounded-md border-2 border-border bg-info-surface p-4 shadow-control"
          aria-labelledby="receiptTitle"
        >
          <h2 id="receiptTitle" className="font-bold">
            Periksa bacaan struk
          </h2>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Keterangan</dt>
              <dd>{receipt.description}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nominal</dt>
              <dd className="font-bold tabular-nums">{formatRupiah(receipt.amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd>{formatDate(new Date(`${receipt.date}T12:00:00+07:00`))}</dd>
            </div>
          </dl>
          {receipt.confidence < 0.7 && (
            <p className="text-sm font-medium text-muted-foreground">
              Keyakinan bacaan di bawah 70 persen. Pastikan nominal dan keterangan sesuai.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={pending} onClick={() => send("ya")}>
              Simpan pengeluaran
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => send("tidak")}
            >
              Isi ulang manual
            </Button>
          </div>
        </section>
      )}
      <form
        className="space-y-3 rounded-md border-2 border-border bg-card p-4 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="agent-message" className="text-sm font-bold">
          Pesan untuk agen
        </label>
        <textarea
          ref={input}
          id="agent-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          rows={3}
          disabled={pending}
          className="mt-2 w-full resize-y rounded-md border-2 border-border bg-card p-3 text-base shadow-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-describedby="agentHint"
        />
        <p id="agentHint" className="text-xs font-medium text-muted-foreground">
          Contoh: laporan hari ini atau cek stok beras. Foto struk disimpan sebagai
          pengeluaran setelah Anda menyetujuinya.
        </p>
        {image && (
          <div className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-muted p-3 text-sm">
            <span className="min-w-0 break-all">Foto terpilih: {imageName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Hapus foto terpilih"
              onClick={() => {
                setImage(undefined);
                setImageName("");
                if (file.current) file.current.value = "";
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <SpeechInput onTranscript={setText} disabled={pending || !!receipt} />
            <div>
              <input
                ref={file}
                id="receipt-photo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={pending || !!receipt}
                onChange={(e) => void selectFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending || !!receipt}
                onClick={() => file.current?.click()}
              >
                <ImagePlus aria-hidden="true" />
                Pilih foto struk
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            className="min-h-11"
            disabled={pending || (!text.trim() && !image)}
          >
            <Send aria-hidden="true" />
            {pending ? "Memproses" : "Kirim pesan"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </form>
      <p className="text-sm font-medium text-muted-foreground">
        Untuk isian manual, buka{" "}
        <Link
          className="font-bold text-primary underline underline-offset-4"
          href="/kasir"
        >
          Kasir
        </Link>{" "}
        untuk penjualan atau tulis keterangan pengeluaran beserta nominal pada pesan.
      </p>
    </div>
  );
}
