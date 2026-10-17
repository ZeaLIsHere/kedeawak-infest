/**
 * Aturan teks antarmuka, dipakai bersama oleh perkakas `npm run lint:ui` dan
 * pengujian.
 *
 * Berkas ini sengaja tidak memuat karakter dash secara langsung. Setiap
 * karakter dinyatakan lewat titik kode Unicode, supaya maksudnya jelas dan
 * berkas ini tetap enak dibaca.
 *
 * Rujukan: docs/CONVENTIONS.md bagian 2 dan AGENTS.md bagian 3.
 */

export type UiTextRuleId = "emoji" | "dash" | "forbidden";

/** Nama aturan untuk laporan. */
export const RULE_LABELS: Readonly<Record<UiTextRuleId, string>> = {
  emoji: "Tidak ada emoji atau simbol dekoratif",
  dash: "Tidak ada tanda hubung atau variannya",
  forbidden: "Tidak ada kata terlarang",
};

/** Cara memperbaiki setiap pelanggaran. */
export const RULE_GUIDANCE: Readonly<Record<UiTextRuleId, string>> = {
  emoji: "Hapus karakternya. Ikon antarmuka memakai komponen SVG dari lucide-react.",
  dash: "Ganti dengan kata atau spasi, misalnya Rp15.000 sampai Rp20.000. Lihat docs/CONVENTIONS.md bagian 2.2.",
  forbidden: "Ganti dengan teks asli berbahasa Indonesia yang menyebut maksudnya.",
};

/** Nama karakter yang dipakai pada rincian pelanggaran. */
export type UiTextCharacter = {
  readonly codePoint: number;
  readonly name: string;
};

/**
 * Seluruh varian tanda hubung dan garis pisah yang dilarang.
 *
 * Daftar ini lengkap untuk blok yang mungkin muncul dari penyunting teks:
 * tanda hubung biasa, tanda hubung tipografis, garis pisah angka, en dash,
 * em dash, garis mendatar, tanda kurang, dan bentuk lebar penuh.
 */
export const DASH_CHARACTERS: readonly UiTextCharacter[] = [
  { codePoint: 0x002d, name: "tanda hubung biasa" },
  { codePoint: 0x2010, name: "tanda hubung" },
  { codePoint: 0x2011, name: "tanda hubung tanpa pemutus" },
  { codePoint: 0x2012, name: "garis pisah angka" },
  { codePoint: 0x2013, name: "en dash" },
  { codePoint: 0x2014, name: "em dash" },
  { codePoint: 0x2015, name: "garis mendatar" },
  { codePoint: 0x2212, name: "tanda kurang" },
  { codePoint: 0xfe58, name: "small em dash" },
  { codePoint: 0xfe63, name: "small hyphen" },
  { codePoint: 0xff0d, name: "tanda hubung lebar penuh" },
];

/**
 * Sumber pola untuk emoji dan simbol dekoratif.
 *
 * Cakupannya: butir dan butir kecil, panah, simbol teknis, angka dalam
 * lingkaran, bentuk geometri sampai dingbat, simbol tambahan, penanda variasi
 * dan penyambung lebar nol, seluruh blok emoji, serta setiap karakter
 * bergambar menurut kaidah Unicode.
 */
export const DECORATIVE_SYMBOL_PATTERN =
  "[\\u{2022}\\u{2023}\\u{2043}\\u{2190}-\\u{21FF}\\u{2300}-\\u{23FF}\\u{2460}-\\u{24FF}\\u{25A0}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE00}-\\u{FE0F}\\u{200D}\\u{1F000}-\\u{1FAFF}]|\\p{Extended_Pictographic}";

/** Kata dan frasa yang dilarang muncul pada teks antarmuka. */
export const FORBIDDEN_TERMS: readonly string[] = [
  "lorem",
  "ipsum",
  "TODO",
  "placeholder",
  "Coming soon",
];

/**
 * Pola dibangun dari bentuk huruf kecil, karena teks yang diperiksa juga
 * diturunkan ke huruf kecil sebelum dicocokkan.
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = FORBIDDEN_TERMS.map(
  (term) => new RegExp(`\\b${term.toLowerCase().replace(/\s+/gu, "\\s+")}\\b`, "u"),
);

/** Satu pelanggaran pada sebuah potongan teks antarmuka. */
export type UiTextViolation = {
  readonly rule: UiTextRuleId;
  readonly detail: string;
  readonly guidance: string;
};

/** Karakter dash yang muncul pada teks. */
export function findDashCharacters(text: string): readonly UiTextCharacter[] {
  return DASH_CHARACTERS.filter((character) =>
    text.includes(String.fromCodePoint(character.codePoint)),
  );
}

/** Emoji dan simbol dekoratif yang muncul pada teks, tanpa pengulangan. */
export function findDecorativeSymbols(text: string): readonly string[] {
  const pattern = new RegExp(DECORATIVE_SYMBOL_PATTERN, "gu");
  const found = new Set<string>();

  for (const match of text.matchAll(pattern)) {
    found.add(match[0]);
  }

  return [...found];
}

/** Kata terlarang yang muncul pada teks. */
export function findForbiddenTerms(text: string): readonly string[] {
  const lowered = text.toLowerCase();

  return FORBIDDEN_TERMS.filter((term, index) => FORBIDDEN_PATTERNS[index].test(lowered));
}

/**
 * Seluruh pelanggaran pada satu potongan teks antarmuka.
 *
 * Setiap aturan dilaporkan paling banyak sekali per potongan teks, supaya
 * laporan tetap ringkas.
 */
export function findViolationsInText(text: string): readonly UiTextViolation[] {
  const violations: UiTextViolation[] = [];

  const symbols = findDecorativeSymbols(text);
  if (symbols.length > 0) {
    violations.push({
      rule: "emoji",
      detail: `karakter dekoratif ${symbols.map((symbol) => `"${symbol}"`).join(", ")}`,
      guidance: RULE_GUIDANCE.emoji,
    });
  }

  const dashes = findDashCharacters(text);
  if (dashes.length > 0) {
    const detail = dashes
      .map(
        (dash) =>
          `${dash.name} (U+${dash.codePoint.toString(16).toUpperCase().padStart(4, "0")})`,
      )
      .join(", ");
    violations.push({ rule: "dash", detail, guidance: RULE_GUIDANCE.dash });
  }

  const terms = findForbiddenTerms(text);
  if (terms.length > 0) {
    violations.push({
      rule: "forbidden",
      detail: `kata terlarang ${terms.map((term) => `"${term}"`).join(", ")}`,
      guidance: RULE_GUIDANCE.forbidden,
    });
  }

  return violations;
}
