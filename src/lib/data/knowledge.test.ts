import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  addKnowledgeChunk,
  deleteKnowledgeChunk,
  listKnowledgeChunks,
  replaceKnowledgeSource,
} from "./knowledge";

let test: TestDatabase;
let otherBusinessId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

describe("konteks bisnis", () => {
  it("menambah potongan konteks dan mendaftarnya dari yang paling lama", async () => {
    await addKnowledgeChunk(test.db, test.business.id, {
      content: "Warung menjual sembako, buka setiap hari dari pagi sampai malam.",
      source: "profil",
    });
    const second = await addKnowledgeChunk(test.db, test.business.id, {
      content: "Pelanggan terbanyak berasal dari kampung sebelah.",
      source: "profil",
    });

    const chunks = await listKnowledgeChunks(test.db, test.business.id);

    expect(chunks).toHaveLength(2);
    expect(chunks[1]?.id).toBe(second.id);
    expect(chunks[0]?.content).toContain("sembako");
  });

  it("mengganti seluruh potongan dari satu asal", async () => {
    const replaced = await replaceKnowledgeSource(test.db, test.business.id, "profil", [
      "Warung menjual sembako dan bahan masakan.",
      "Harga beras mengikuti harga pasar induk.",
    ]);

    expect(replaced).toHaveLength(2);

    const chunks = await listKnowledgeChunks(test.db, test.business.id);

    expect(chunks).toHaveLength(2);
    expect(chunks.every((chunk) => chunk.source === "profil")).toBe(true);
    expect(chunks.map((chunk) => chunk.content)).not.toContain(
      "Pelanggan terbanyak berasal dari kampung sebelah.",
    );
  });

  it("menerima asal yang berbeda tanpa mengganggu asal lainnya", async () => {
    await replaceKnowledgeSource(test.db, test.business.id, "catatan-pemilik", [
      "Pemasok beras datang setiap hari Selasa.",
    ]);

    const chunks = await listKnowledgeChunks(test.db, test.business.id);

    expect(chunks).toHaveLength(3);
    expect(
      await replaceKnowledgeSource(test.db, test.business.id, "catatan-pemilik", []),
    ).toEqual([]);
    expect(await listKnowledgeChunks(test.db, test.business.id)).toHaveLength(2);
  });

  it("menghapus satu potongan konteks", async () => {
    const chunks = await listKnowledgeChunks(test.db, test.business.id);
    const removed = await deleteKnowledgeChunk(
      test.db,
      test.business.id,
      chunks[0]?.id ?? "",
    );

    expect(removed).toBe(true);
    expect(await listKnowledgeChunks(test.db, test.business.id)).toHaveLength(1);
    expect(await deleteKnowledgeChunk(test.db, test.business.id, "bukan kunci")).toBe(
      false,
    );
  });

  it("memisahkan konteks antar warung", async () => {
    expect(await listKnowledgeChunks(test.db, otherBusinessId)).toEqual([]);
    expect(
      await deleteKnowledgeChunk(
        test.db,
        otherBusinessId,
        (await listKnowledgeChunks(test.db, test.business.id))[0]?.id ?? "",
      ),
    ).toBe(false);
    const otherChunks = await replaceKnowledgeSource(test.db, otherBusinessId, "profil", [
      "Konteks warung tetangga",
    ]);

    expect(otherChunks).toHaveLength(1);
    expect(await listKnowledgeChunks(test.db, test.business.id)).toHaveLength(1);
    expect(await listKnowledgeChunks(test.db, otherBusinessId)).toHaveLength(1);
  });
});
