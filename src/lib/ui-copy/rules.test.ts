import { describe, expect, it } from "vitest";

import {
  DASH_CHARACTERS,
  DECORATIVE_SYMBOL_PATTERN,
  findDashCharacters,
  findDecorativeSymbols,
  findForbiddenTerms,
  findViolationsInText,
} from "./rules";

/** Teks antarmuka yang benar, tidak boleh ditandai aturan mana pun. */
const CLEAN_TEXTS: readonly string[] = [
  "Belum ada data",
  "Penjualan hari ini Rp150.000",
  "Rentang harga Rp15.000 sampai Rp20.000",
  "Stok kopi susu tinggal 3 bungkus",
  "Nomor telepon 081234567890",
  "Produk terlaris minggu ini",
];

/** Simbol dekoratif yang wajib ditolak, satu contoh per kelompok. */
const DECORATIVE_SAMPLES: readonly string[] = [
  "\u{1F4CA}",
  "\u{1FAD9}",
  "\u{1F1EE}\u{1F1E9}",
  "\u2022",
  "\u2023",
  "\u2192",
  "\u2713",
  "\u2605",
  "\u2460",
];

/** Setiap frasa terlarang beserta contoh teks yang memuatnya. */
const FORBIDDEN_SAMPLES: readonly (readonly [string, string])[] = [
  ["lorem", "Isi teks lorem di sini"],
  ["ipsum", "Isi teks ipsum di sini"],
  ["TODO", "todo isi bagian ini"],
  ["placeholder", "Isi placeholder nama warung"],
  ["Coming soon", "Fitur baru coming soon"],
];

describe("aturan tanda hubung", () => {
  it("mendaftar seluruh varian yang dilarang", () => {
    expect(DASH_CHARACTERS.map((character) => character.codePoint)).toEqual([
      0x002d, 0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212, 0xfe58, 0xfe63,
      0xff0d,
    ]);
  });

  it("mengenali setiap varian pada teks", () => {
    for (const character of DASH_CHARACTERS) {
      const text = `Kopi${String.fromCodePoint(character.codePoint)}susu`;

      expect(findDashCharacters(text)).toHaveLength(1);
      expect(findViolationsInText(text).map((violation) => violation.rule)).toContain(
        "dash",
      );
    }
  });

  it("menyebut nama karakter pada rinciannya", () => {
    const [violation] = findViolationsInText("Penjualan Rp15.000-20.000");

    expect(violation.rule).toBe("dash");
    expect(violation.detail).toContain("U+002D");
  });

  it("tidak menandai teks yang benar", () => {
    for (const text of CLEAN_TEXTS) {
      expect(findDashCharacters(text)).toEqual([]);
    }
  });
});

describe("aturan emoji dan simbol dekoratif", () => {
  it("punya pola yang sah saat dipakai dengan penanda unicode", () => {
    expect(() => new RegExp(DECORATIVE_SYMBOL_PATTERN, "gu")).not.toThrow();
  });

  it("mengenali setiap contoh simbol dekoratif", () => {
    for (const symbol of DECORATIVE_SAMPLES) {
      expect(findDecorativeSymbols(`Catatan ${symbol} penting`).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("mencatat setiap karakter satu kali saja", () => {
    expect(findDecorativeSymbols("Pada bulan ini \u{1F4CA} lalu \u{1F4CA}")).toEqual([
      "\u{1F4CA}",
    ]);
  });

  it("tidak menandai teks yang benar", () => {
    for (const text of CLEAN_TEXTS) {
      expect(findDecorativeSymbols(text)).toEqual([]);
    }
  });
});

describe("aturan kata terlarang", () => {
  it("mengenali setiap frasa secara terpisah", () => {
    for (const [term, sample] of FORBIDDEN_SAMPLES) {
      expect(findForbiddenTerms(sample)).toEqual([term]);
    }
  });

  it("mengenali frasa tanpa peduli huruf besar kecil", () => {
    expect(findForbiddenTerms("Fitur baru Coming soon")).toEqual(["Coming soon"]);
    expect(findForbiddenTerms("Fitur baru COMING SOON")).toEqual(["Coming soon"]);
    expect(findForbiddenTerms("Fitur baru Coming Soon")).toEqual(["Coming soon"]);
  });

  it("tidak menandai frasa yang hanya muncul di tengah kata", () => {
    expect(findForbiddenTerms("Metodologi pencatatan warung")).toEqual([]);
  });

  it("tidak menandai teks yang benar", () => {
    for (const text of CLEAN_TEXTS) {
      expect(findForbiddenTerms(text)).toEqual([]);
    }
  });
});

describe("findViolationsInText", () => {
  it("melaporkan paling banyak satu pelanggaran per aturan", () => {
    const violations = findViolationsInText("Kopi-susu \u{1F4CA} lorem");

    expect(violations.map((violation) => violation.rule)).toEqual([
      "emoji",
      "dash",
      "forbidden",
    ]);

    for (const violation of violations) {
      expect(violation.detail.length).toBeGreaterThan(0);
      expect(violation.guidance.length).toBeGreaterThan(0);
    }
  });

  it("tidak melaporkan apa pun pada teks yang benar", () => {
    for (const text of CLEAN_TEXTS) {
      expect(findViolationsInText(text)).toEqual([]);
    }
  });
});
