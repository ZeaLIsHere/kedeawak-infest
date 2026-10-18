import { describe, expect, it } from "vitest";

import { buildCashSuggestions, formatCashInput, parseCashInput } from "./cash";

describe("kolom uang tunai", () => {
  it("membuang pemisah ribuan dan karakter lain", () => {
    expect(parseCashInput("30.000")).toBe("30000");
    expect(parseCashInput("Rp 1.250.000")).toBe("1250000");
    expect(parseCashInput("abc")).toBe("");
  });

  it("membuang nol di depan tetapi mempertahankan satu nol", () => {
    expect(parseCashInput("000500")).toBe("500");
    expect(parseCashInput("0")).toBe("0");
  });

  it("menulis nominal dengan pemisah ribuan", () => {
    expect(formatCashInput("30000")).toBe("30.000");
    expect(formatCashInput("1250000")).toBe("1.250.000");
    expect(formatCashInput("")).toBe("");
  });
});

describe("saran nominal tunai", () => {
  it("menawarkan uang pas dan pembulatan ke atas", () => {
    expect(buildCashSuggestions(23_500)).toEqual([23_500, 40_000, 50_000, 100_000]);
  });

  it("tidak mengulang nominal yang sama", () => {
    expect(buildCashSuggestions(20_000)).toEqual([20_000, 50_000, 100_000]);
  });

  it("membulatkan nominal besar ke kelipatan berikutnya", () => {
    expect(buildCashSuggestions(120_000)).toEqual([120_000, 150_000, 200_000]);
  });

  it("tidak menawarkan saran tanpa belanja", () => {
    expect(buildCashSuggestions(0)).toEqual([]);
    expect(buildCashSuggestions(-5_000)).toEqual([]);
  });
});
