import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  createFieldCipher,
  FieldEncryptionKeyError,
  getFieldCipher,
  normalizePhoneNumber,
  readFieldEncryptionKey,
} from "./field-encryption";

const KEY = randomBytes(32).toString("hex");
const OTHER_KEY = randomBytes(32).toString("hex");
const cipher = createFieldCipher(KEY);

describe("enkripsi kolom", () => {
  it("mengembalikan nama apa adanya setelah dibuka", () => {
    const names = ["Bu Sari", "Warung Tégall", "Pelanggan Baru"];

    for (const name of names) {
      expect(cipher.decrypt(cipher.encrypt(name))).toBe(name);
    }
  });

  it("menghasilkan teks terenkripsi yang berbeda untuk isi yang sama", () => {
    const first = cipher.encrypt("Bu Sari");
    const second = cipher.encrypt("Bu Sari");

    expect(first).not.toBe(second);
    expect(cipher.decrypt(first)).toBe(cipher.decrypt(second));
  });

  it("tidak memuat isi aslinya", () => {
    const encrypted = cipher.encrypt("081234567890");

    expect(encrypted).not.toContain("081234567890");
    expect(encrypted.startsWith("v1:")).toBe(true);
  });

  it("menolak teks terenkripsi yang isinya diubah", () => {
    const encrypted = cipher.encrypt("Bu Sari");
    const parts = encrypted.split(":");
    const body = Buffer.from(parts[3] ?? "", "base64");
    const changed = Buffer.from(body);

    changed[0] = (changed[0] ?? 0) ^ 0xff;

    const tampered = [parts[0], parts[1], parts[2], changed.toString("base64")].join(":");

    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it("menolak teks terenkripsi dari kunci lain", () => {
    const encrypted = createFieldCipher(OTHER_KEY).encrypt("Bu Sari");

    expect(() => cipher.decrypt(encrypted)).toThrow();
  });

  it("menolak bentuk teks terenkripsi yang tidak dikenal", () => {
    expect(() => cipher.decrypt("bukan teks terenkripsi")).toThrow(
      "Bentuk teks terenkripsi tidak dikenal.",
    );
  });

  it("menolak kunci yang bukan 32 bita heksadesimal", () => {
    expect(() => createFieldCipher("terlalu pendek")).toThrow(FieldEncryptionKeyError);
    expect(() => createFieldCipher("z".repeat(64))).toThrow(FieldEncryptionKeyError);
  });
});

describe("sidik jari nomor telepon", () => {
  it("memberi sidik jari yang sama untuk penulisan nomor yang berbeda", () => {
    const forms = [
      "081234567890",
      "6281234567890",
      "+62 812 3456 7890",
      "0812-3456-7890",
    ];
    const prints = forms.map((form) => cipher.hashPhoneNumber(form));

    expect(new Set(prints).size).toBe(1);
  });

  it("memberi sidik jari yang berbeda untuk nomor yang berbeda", () => {
    expect(cipher.hashPhoneNumber("081234567890")).not.toBe(
      cipher.hashPhoneNumber("081234567891"),
    );
  });

  it("berbentuk heksadesimal sepanjang 64 karakter", () => {
    expect(cipher.hashPhoneNumber("081234567890")).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("tidak dapat dibalik menjadi nomor aslinya", () => {
    expect(cipher.hashPhoneNumber("081234567890")).not.toContain("8123456789");
  });

  it("berbeda untuk kunci yang berbeda", () => {
    expect(cipher.hashPhoneNumber("081234567890")).not.toBe(
      createFieldCipher(OTHER_KEY).hashPhoneNumber("081234567890"),
    );
  });

  it("menyeragamkan nomor tanpa angka", () => {
    expect(normalizePhoneNumber("tanpa angka")).toBe("");
  });
});

describe("kunci dari lingkungan", () => {
  it("membaca kunci yang ada", () => {
    expect(readFieldEncryptionKey({ FIELD_ENCRYPTION_KEY: ` ${KEY} ` })).toBe(KEY);
  });

  it("memberi pesan yang jelas bila kunci belum diisi", () => {
    expect(() => readFieldEncryptionKey({})).toThrow(FieldEncryptionKeyError);
    expect(() => readFieldEncryptionKey({ FIELD_ENCRYPTION_KEY: "   " })).toThrow(
      "FIELD_ENCRYPTION_KEY belum diisi.",
    );
  });

  it("membuat alat sandi yang setara dengan kunci yang sama", () => {
    const fromEnv = getFieldCipher({ FIELD_ENCRYPTION_KEY: KEY });

    expect(fromEnv.decrypt(cipher.encrypt("Bu Sari"))).toBe("Bu Sari");
  });
});
