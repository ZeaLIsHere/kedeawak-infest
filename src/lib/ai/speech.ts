export type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
export type SpeechConstructor = new () => SpeechRecognitionInstance;
export function speechConstructor<T>(scope: {
  SpeechRecognition?: T;
  webkitSpeechRecognition?: T;
}): T | undefined {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

const TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo"; // lint-ui-ignore: nama model resmi Groq
const TRANSCRIPTION_TIMEOUT_MS = 20_000;
const AUDIO_LIMIT = 16 * 1024 * 1024;
const TRANSCRIPT_LIMIT = 3800;
const TYPED_RETRY = "Silakan ketik ulang pesan Anda.";
const AUDIO_EXTENSIONS = new Map([
  ["audio/ogg", "ogg"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "mp4"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"], // lint-ui-ignore: MIME resmi audio WAV
  ["audio/webm", "webm"],
  ["audio/flac", "flac"],
]);

export async function transcribeAudio(
  bytes: Uint8Array,
  contentType: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error(
      `Konfigurasi layanan transkripsi suara belum tersedia. ${TYPED_RETRY}`,
    );
  }
  const mime = contentType.split(";", 1)[0].trim().toLowerCase();
  const extension = AUDIO_EXTENSIONS.get(mime);
  if (!extension) {
    throw new Error(`Format rekaman suara belum didukung. ${TYPED_RETRY}`);
  }
  if (bytes.byteLength === 0) {
    throw new Error(`Rekaman suara kosong. ${TYPED_RETRY}`);
  }
  if (bytes.byteLength > AUDIO_LIMIT) {
    throw new Error(`Ukuran rekaman suara melebihi batas 16 MB. ${TYPED_RETRY}`);
  }

  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(bytes)], { type: mime }),
    `audio.${extension}`,
  );
  form.set(
    "model",
    process.env.GROQ_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL,
  );
  form.set("language", "id");
  form.set("response_format", "json");
  form.set("temperature", "0");

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("Waktu transkripsi habis"));
      controller.abort();
    }, TRANSCRIPTION_TIMEOUT_MS);
  });
  try {
    const operation = async (): Promise<string> => {
      const response = await fetcher(TRANSCRIPTION_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error("Layanan transkripsi belum tersedia");
      }
      const body: unknown = await response.json();
      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        !("text" in body) ||
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > TRANSCRIPT_LIMIT
      ) {
        throw new Error("Hasil transkripsi belum dapat dibaca");
      }
      return body.text.trim();
    };
    return await Promise.race([operation(), timeout]);
  } catch {
    throw new Error(
      timedOut
        ? `Waktu transkripsi suara habis. ${TYPED_RETRY}`
        : `Transkripsi rekaman suara belum berhasil. ${TYPED_RETRY}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
