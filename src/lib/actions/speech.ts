"use server";
import { transcribeAudio } from "@/lib/ai/speech";

type Result = { ok: true; text: string } | { ok: false; error: string };

const MAX_BYTES = 16 * 1024 * 1024;

/**
 * Menyalin rekaman suara dari halaman percakapan menjadi teks.
 *
 * Perekaman dilakukan di peramban, lalu berkasnya dikirim ke lapisan AI yang
 * sudah dipakai untuk pesan suara WhatsApp. Model bahasa tidak dipakai di sini
 * karena penyalinan suara memerlukan layanan khusus.
 */
export async function transcribeSpeechAction(form: FormData): Promise<Result> {
  try {
    const file = form.get("audio");
    if (
      typeof file !== "object" ||
      file === null ||
      typeof (file as Blob).arrayBuffer !== "function" ||
      (file as Blob).size === 0
    ) {
      return {
        ok: false,
        error: "Rekaman suara kosong. Silakan ketik ulang pesan Anda.",
      };
    }
    const blob = file as Blob;
    if (blob.size > MAX_BYTES) {
      return {
        ok: false,
        error:
          "Ukuran rekaman suara melebihi batas 16 MB. Silakan ketik ulang pesan Anda.",
      };
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = await transcribeAudio(bytes, blob.type || "audio/webm");
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Transkripsi rekaman suara belum berhasil. Silakan ketik ulang pesan Anda.",
    };
  }
}
