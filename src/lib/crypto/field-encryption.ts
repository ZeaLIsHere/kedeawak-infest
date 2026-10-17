import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/*
 * Enkripsi nama dan nomor telepon pelanggan, sesuai `docs/ARCHITECTURE.md`
 * bagian 8 butir 1.
 *
 * Teks terenkripsi tidak dapat dicari, sehingga nomor telepon juga disimpan
 * sebagai sidik jari yang boleh dicari, sesuai aturan skema bagian 4 butir 7.
 * Sidik jari memakai HMAC, bukan hash biasa, supaya nomor tidak dapat ditebak
 * dengan mencoba seluruh nomor yang mungkin.
 *
 * Dua kunci diturunkan dari satu kunci induk dengan HKDF, supaya kunci
 * penyandian dan kunci sidik jari tidak pernah sama.
 */

/*
 * Nama algoritma penyandian berasal dari OpenSSL dan memang memuat tanda
 * hubung, jadi barisnya diberi penanda pengecualian beserta alasannya. Nama
 * nama lain di bawah ini sengaja tidak memakai tanda hubung, supaya
 * `npm run lint:ui` tetap ketat.
 */
const ALGORITHM = "aes-256-gcm"; // lint-ui-ignore: nama algoritma milik OpenSSL, bukan teks antarmuka
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = "v1";
const SEPARATOR = ":";
const HKDF_SALT = "kedeawak.kanal.warung";
const ENCRYPTION_INFO = "kedeawak.field.encryption.v1";
const INDEX_INFO = "kedeawak.phone.index.v1";

/** Lingkungan yang dibaca. Bentuknya longgar supaya mudah diuji. */
type Environment = Readonly<Record<string, string | undefined>>;

/** Kunci enkripsi tidak ada atau bentuknya salah. */
export class FieldEncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEncryptionKeyError";
  }
}

function parseKey(keyHex: string): Buffer {
  const trimmed = keyHex.trim();

  if (!/^[0-9a-fA-F]{64}$/u.test(trimmed)) {
    throw new FieldEncryptionKeyError(
      "FIELD_ENCRYPTION_KEY harus 64 karakter heksadesimal, yaitu 32 bita.",
    );
  }

  return Buffer.from(trimmed, "hex");
}

function deriveKey(masterKey: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", masterKey, HKDF_SALT, info, KEY_BYTES));
}

/**
 * Menyeragamkan nomor telepon sebelum disidik jari.
 *
 * Nomor dari WhatsApp berbentuk `62812...`, sedangkan nomor yang diketik
 * pemilik biasanya berbentuk `0812...`. Keduanya harus menghasilkan sidik jari
 * yang sama, jadi awalan `62` diubah menjadi `0` dan seluruh pemisah dibuang.
 */
export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D+/gu, "");

  if (digits.startsWith("62")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

/** Alat sandi untuk satu kunci induk. */
export type FieldCipher = {
  /** Menyandikan teks menjadi teks terenkripsi yang boleh disimpan. */
  encrypt: (plaintext: string) => string;
  /** Membuka teks terenkripsi. Gagal bila isinya diubah. */
  decrypt: (payload: string) => string;
  /** Membuat sidik jari nomor telepon untuk pencarian. */
  hashPhoneNumber: (phoneNumber: string) => string;
};

/** Membuat alat sandi dari kunci induk berbentuk heksadesimal. */
export function createFieldCipher(keyHex: string): FieldCipher {
  const masterKey = parseKey(keyHex);
  const encryptionKey = deriveKey(masterKey, ENCRYPTION_INFO);
  const indexKey = deriveKey(masterKey, INDEX_INFO);

  return {
    encrypt(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);

      return [
        VERSION,
        iv.toString("base64"),
        cipher.getAuthTag().toString("base64"),
        ciphertext.toString("base64"),
      ].join(SEPARATOR);
    },

    decrypt(payload) {
      const [version, iv, tag, ciphertext] = payload.split(SEPARATOR);

      if (
        version !== VERSION ||
        iv === undefined ||
        tag === undefined ||
        ciphertext === undefined
      ) {
        throw new Error("Bentuk teks terenkripsi tidak dikenal.");
      }

      const decipher = createDecipheriv(
        ALGORITHM,
        encryptionKey,
        Buffer.from(iv, "base64"),
      );

      decipher.setAuthTag(Buffer.from(tag, "base64"));

      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    },

    hashPhoneNumber(phoneNumber) {
      return createHmac("sha256", indexKey)
        .update(normalizePhoneNumber(phoneNumber))
        .digest("hex");
    },
  };
}

/** Membaca kunci induk dari lingkungan, dengan pesan jelas bila belum diisi. */
export function readFieldEncryptionKey(env: Environment = process.env): string {
  const key = env.FIELD_ENCRYPTION_KEY?.trim();

  if (key === undefined || key === "") {
    throw new FieldEncryptionKeyError(
      "FIELD_ENCRYPTION_KEY belum diisi. Isi variabel itu pada .env.local, lalu jalankan ulang.",
    );
  }

  return key;
}

/*
 * Alat sandi dibuat ulang setiap kali dipanggil, bukan disimpan, supaya
 * perubahan variabel lingkungan saat pengujian tidak tertinggal di simpanan.
 * Penurunan kunci memakan waktu mikrodetik, jadi biayanya tidak berarti.
 */
export function getFieldCipher(env: Environment = process.env): FieldCipher {
  return createFieldCipher(readFieldEncryptionKey(env));
}
