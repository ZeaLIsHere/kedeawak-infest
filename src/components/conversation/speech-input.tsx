"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeSpeechAction } from "@/lib/actions/speech";

const RECORDING_LIMIT_MS = 60_000;
const noSubscription = () => () => {};

function canRecord(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function SpeechInput({
  onTranscript,
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const supported = useSyncExternalStore(noSubscription, canRecord, () => false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      try {
        recorder.current?.stop();
      } catch {
        // Perekam mungkin belum aktif, aman untuk diabaikan.
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function release() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }

  async function upload(blob: Blob) {
    if (blob.size === 0) {
      setError("Rekaman suara kosong. Silakan ketik ulang pesan Anda.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set(
        "audio",
        new File([blob], "rekaman", { type: blob.type || "audio/webm" }),
      );
      const result = await transcribeSpeechAction(form);
      if (result.ok) onTranscript(result.text);
      else setError(result.error);
    } catch {
      setError(
        "Transkripsi rekaman suara belum berhasil. Silakan ketik ulang pesan Anda.",
      );
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    try {
      recorder.current?.stop();
    } catch {
      // Perekam sudah berhenti, aman untuk diabaikan.
    }
    setRecording(false);
  }

  async function start() {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      chunks.current = [];
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      instance.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: instance.mimeType || "audio/webm",
        });
        release();
        void upload(blob);
      };
      instance.start();
      setRecording(true);
      timer.current = setTimeout(stop, RECORDING_LIMIT_MS);
    } catch {
      release();
      setError(
        "Mikrofon belum dapat digunakan. Izinkan akses mikrofon lalu coba lagi.",
      );
      setRecording(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Peramban ini belum mendukung perekaman suara. Gunakan kolom ketik.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={disabled || busy}
        onClick={() => (recording ? stop() : void start())}
      >
        {recording ? (
          <Square aria-hidden="true" />
        ) : busy ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <Mic aria-hidden="true" />
        )}
        {recording
          ? "Selesai bicara"
          : busy
            ? "Memproses suara"
            : "Gunakan suara"}
      </Button>
      {error && (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
