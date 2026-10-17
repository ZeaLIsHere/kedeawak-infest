import ts from "typescript";
import { describe, expect, it } from "vitest";

import { extractUiText, scanSource } from "./lint-ui-copy.ts";

const parse = (code: string): ts.SourceFile =>
  ts.createSourceFile("uji.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const textsOf = (code: string): readonly string[] =>
  extractUiText(parse(code)).map((piece) => piece.text.trim());

describe("extractUiText", () => {
  it("mengambil teks JSX dan nilai atribut yang dibaca pengguna", () => {
    const found = textsOf(`
      export function Halaman() {
        return (
          <section title="Ringkasan warung" aria-label="Ringkasan hari ini">
            Belum ada data
          </section>
        );
      }
    `);

    expect(found).toContain("Ringkasan warung");
    expect(found).toContain("Ringkasan hari ini");
    expect(found).toContain("Belum ada data");
  });

  it("tetap memeriksa nilai placeholder, alt, dan title", () => {
    const found = textsOf(`
      export function Halaman() {
        return (
          <form>
            <input placeholder="Nama pelanggan" />
            <img alt="Struk pembelian" src="/struk.png" />
            <span title="Tekan untuk mengirim">Kirim</span>
          </form>
        );
      }
    `);

    expect(found).toEqual([
      "Nama pelanggan",
      "Struk pembelian",
      "Tekan untuk mengirim",
      "Kirim",
    ]);
  });

  it("melewati nama kelas, kunci objek, nama variabel CSS, dan pesan pengembang", () => {
    const found = textsOf(`
      import { cn } from "@/lib/utils";

      export const label = { "nama-kunci": "nilai satu", kode: "nilai dua" };
      export const kelas = cn("flex gap-3", "text-body");
      export const namaVariabel = "--font-geist-sans";

      export function jalankan() {
        console.log("catatan pengembang 1-2");
        throw new Error("gagal memuat 3-4");
      }

      export function Halaman() {
        return <p className="text-body text-muted-foreground">Selamat datang</p>;
      }
    `);

    expect(found).toEqual(["nilai satu", "nilai dua", "Selamat datang"]);
  });

  it("melewati tipe literal dan anggota enum", () => {
    const found = textsOf(`
      type Keadaan = "menunggu" | "selesai";

      enum Peran {
        Pemilik = "pemilik",
      }

      export const contoh: Keadaan = "menunggu";
    `);

    expect(found).toEqual(["menunggu"]);
  });
});

describe("scanSource", () => {
  it("melaporkan pelanggaran beserta berkas dan barisnya", () => {
    const code = [
      "export const contoh = {",
      '  labelKosong: "Belum ada data",',
      '  judul: "Ringkasan warung hari ini",',
      '  rentang: "Rp15.000-20.000",',
      "};",
    ].join("\n");

    const violations = scanSource(code, "src/contoh.ts");

    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe("src/contoh.ts");
    expect(violations[0].line).toBe(4);
    expect(violations[0].rule).toBe("dash");
    expect(violations[0].text).toBe("Rp15.000-20.000");
    expect(violations[0].guidance.length).toBeGreaterThan(0);
  });

  it("meringkas spasi berlebih pada potongan teks", () => {
    const violations = scanSource(
      'export const contoh = "Belum\\n   ada   data 1-2";',
      "src/contoh.ts",
    );

    expect(violations[0].text).toBe("Belum ada data 1-2");
  });

  it("tidak melaporkan apa pun pada berkas yang bersih", () => {
    const code = `
      export function Halaman() {
        return <h1 className="text-page-title">Belum ada data</h1>;
      }
    `;

    expect(scanSource(code, "src/contoh.tsx")).toEqual([]);
  });

  it("melempar galat pada berkas yang gagal diurai", () => {
    expect(() =>
      scanSource('export const rusak = "tanpa penutup;', "src/rusak.ts"),
    ).toThrow(/gagal diurai/u);
  });
});
