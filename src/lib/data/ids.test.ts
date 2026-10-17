import { describe, expect, it } from "vitest";

import { isUuid } from "./ids";

describe("bentuk kunci baris", () => {
  it("menerima kunci yang berbentuk uuid", () => {
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isUuid("8f14e45f-ceea-467a-9a8a-1d6f0e2f4a11")).toBe(true);
    expect(isUuid("8F14E45F-CEEA-467A-9A8A-1D6F0E2F4A11")).toBe(true);
  });

  it("menolak kunci yang bukan uuid", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("beras")).toBe(false);
    expect(isUuid("8f14e45f-ceea-467a-9a8a-1d6f0e2f4a1")).toBe(false);
    expect(isUuid("8f14e45fceea467a9a8a1d6f0e2f4a11")).toBe(false);
    expect(isUuid("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz")).toBe(false);
    expect(isUuid("8f14e45f-ceea-467a-9a8a-1d6f0e2f4a11 ")).toBe(false);
    expect(isUuid("8f14e45f-ceea-467a-9a8a-1d6f0e2f4a11x")).toBe(false);
  });
});
