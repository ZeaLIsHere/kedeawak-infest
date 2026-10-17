import Link from "next/link";
import { Image as ImageIcon, MessageCircle, Mic, UserRound } from "lucide-react";

import { InboxRefreshButton } from "./inbox-refresh-button";
import { formatDateTime, formatTime } from "@/lib/format/date";

export type InboxConversation = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly preview: string;
  readonly previewKind: "text" | "voice" | "image";
  readonly lastMessageAt: Date | null;
};

export type InboxMessage = {
  readonly id: string;
  readonly kind: "text" | "voice" | "image";
  readonly body: string;
  readonly createdAt: Date;
};

type InboxProps = {
  readonly conversations: readonly InboxConversation[];
  readonly selected: InboxConversation | undefined;
  readonly messages: readonly InboxMessage[];
  readonly channelLabel: string;
  readonly connected: boolean;
  readonly simulation: boolean;
};

function displayPhone(phone: string | null): string {
  if (phone === null) return "Nomor pelanggan tidak tersedia";
  const digits = phone.replace(/\D/gu, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;

  return `whatsapp:+${normalized}`;
}

function KindLabel({ kind }: { readonly kind: InboxMessage["kind"] }) {
  if (kind === "voice") {
    return (
      <p className="mb-1 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
        <Mic className="size-3.5" aria-hidden="true" />
        Pesan suara
      </p>
    );
  }

  if (kind === "image") {
    return (
      <p className="mb-1 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
        <ImageIcon className="size-3.5" aria-hidden="true" />
        Foto
      </p>
    );
  }

  return null;
}

function ConversationPreview({ conversation }: { readonly conversation: InboxConversation }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      {conversation.previewKind === "voice" && (
        <Mic className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {conversation.previewKind === "image" && (
        <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{conversation.preview}</span>
    </span>
  );
}

function EmptyThread() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <MessageCircle className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-medium">Belum ada pesan dari pelanggan ini</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Pesan yang masuk lewat WhatsApp akan tampil di sini.
      </p>
    </div>
  );
}

/** Daftar percakapan dan isi pesan pelanggan, tanpa balasan agen. */
export function WhatsAppInbox({
  conversations,
  selected,
  messages,
  channelLabel,
  connected,
  simulation,
}: InboxProps) {
  const receiverTitle = simulation
    ? "Simulasi pesan aktif"
    : connected
      ? "Menerima pesan WhatsApp"
      : "Kanal belum terhubung";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="grid min-h-[34rem] lg:h-[38rem] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-section-title font-semibold">Percakapan</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium tabular-nums text-muted-foreground">
              {conversations.length}
            </span>
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto p-2"
            aria-label="Daftar percakapan pelanggan"
          >
            {conversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="font-medium">Belum ada percakapan</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kirim pesan dari nomor yang sudah bergabung ke Sandbox Twilio.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => {
                  const active = conversation.id === selected?.id;

                  return (
                    <li key={conversation.id}>
                      <Link
                        href={{
                          pathname: "/whatsapp",
                          query: { percakapan: conversation.id },
                        }}
                        scroll={false}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        className={`flex flex-col gap-1 rounded-lg border px-3 py-3 transition-colors ${
                          active
                            ? "border-primary/20 bg-primary/5"
                            : "border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words text-sm font-semibold">
                            {conversation.name}
                          </span>
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground">
                            WhatsApp
                          </span>
                        </span>
                        <ConversationPreview conversation={conversation} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <p className="border-t border-border px-5 py-3 text-caption text-muted-foreground">
            Riwayat tersimpan di perangkat ini
          </p>
        </aside>

        <section
          className="flex min-h-0 flex-col"
          aria-label={selected === undefined ? "Isi percakapan" : `Pesan dari ${selected.name}`}
        >
          {selected === undefined ? (
            <EmptyThread />
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-section-title font-semibold">
                    {selected.name}
                  </h2>
                  <p className="break-all text-caption text-muted-foreground">
                    {displayPhone(selected.phone)}
                  </p>
                </div>
                <span className="rounded-md border border-border px-3 py-1 text-caption text-muted-foreground">
                  {channelLabel}
                </span>
              </header>

              <div
                className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
                role="log"
                aria-label={`Isi percakapan dengan ${selected.name}`}
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <EmptyThread />
                ) : (
                  <ol className="flex flex-col gap-3">
                    {messages.map((message) => (
                      <li key={message.id} className="flex justify-start">
                        <article className="max-w-[85%] rounded-xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3">
                          <KindLabel kind={message.kind} />
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.body ||
                              (message.kind === "image"
                                ? "Foto diterima tanpa keterangan."
                                : "Isi pesan belum tersedia.")}
                          </p>
                          <time
                            dateTime={message.createdAt.toISOString()}
                            className="mt-1 block text-caption text-muted-foreground"
                          >
                            {formatTime(message.createdAt)}
                          </time>
                        </article>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      connected ? "bg-success" : "bg-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{receiverTitle}</p>
                    <p className="text-caption text-muted-foreground">
                      {selected.lastMessageAt === null
                        ? "Belum ada pesan pelanggan"
                        : `Pesan terakhir diterima ${formatDateTime(selected.lastMessageAt)} WIB`}
                    </p>
                  </div>
                </div>
                <InboxRefreshButton />
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
