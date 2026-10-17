import { describe, expect, it } from "vitest";
import { integerField, textField, safeActionError } from "./validation";
describe("validasi mutasi server", () => {
  it("menolak angka kosong pecahan negatif dan angka berlebih", () => {
    for (const value of ["", " ", "1.5", "-1", "2147483648", "1e3", "0x10"]) {
      const f = new FormData();
      f.set("stock", value);
      expect(() => integerField(f, "stock")).toThrow();
    }
  });
  it("membaca rupiah penuh dan teks yang dipangkas", () => {
    const f = new FormData();
    f.set("stock", "12000");
    f.set("name", " Beras ");
    expect(integerField(f, "stock")).toBe(12000);
    expect(textField(f, "name")).toBe("Beras");
  });
  it("menyembunyikan pesan basis data dan rahasia", () => {
    expect(safeActionError(new Error("Failed query secret"))).toBe(
      "Perubahan belum tersimpan. Silakan coba kembali",
    );
  });
});
