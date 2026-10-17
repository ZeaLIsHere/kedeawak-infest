import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { knowledgeChunks, type KnowledgeChunk } from "../db/schema";
import { isUuid } from "./ids";

/*
 * Konteks bisnis yang dipakai agen saat menjawab.
 *
 * Sesuai keputusan A5 pada `docs/ARCHITECTURE.md` bagian 10, tidak ada kolom
 * vektor di sini. Data warung berupa data terstruktur, sehingga konteksnya
 * diambil lewat query biasa, bukan lewat kemiripan vektor.
 */

/** Satu potongan konteks bisnis. */
export type KnowledgeChunkInput = {
  readonly content: string;
  /** Asal potongan, misalnya nama berkas atau nama bagian profil warung. */
  readonly source: string;
};

/** Menambah satu potongan konteks bisnis. */
export async function addKnowledgeChunk(
  db: Database,
  businessId: string,
  input: KnowledgeChunkInput,
): Promise<KnowledgeChunk> {
  const [chunk] = await db
    .insert(knowledgeChunks)
    .values({ businessId, content: input.content, source: input.source })
    .returning();

  if (chunk === undefined) {
    throw new Error("Potongan konteks bisnis gagal disimpan");
  }

  return chunk;
}

/** Seluruh potongan konteks bisnis sebuah warung, dari yang paling lama. */
export async function listKnowledgeChunks(
  db: Database,
  businessId: string,
): Promise<KnowledgeChunk[]> {
  return db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.businessId, businessId))
    .orderBy(asc(knowledgeChunks.createdAt));
}

/**
 * Mengganti seluruh potongan konteks dari satu asal.
 *
 * Dipakai saat menyiapkan data demo dan saat profil warung diubah, supaya isi
 * konteks selalu berasal dari sumber yang berlaku dan tidak menumpuk.
 */
export async function replaceKnowledgeSource(
  db: Database,
  businessId: string,
  source: string,
  contents: readonly string[],
): Promise<KnowledgeChunk[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.businessId, businessId),
          eq(knowledgeChunks.source, source),
        ),
      );

    if (contents.length === 0) {
      return [];
    }

    return tx
      .insert(knowledgeChunks)
      .values(contents.map((content) => ({ businessId, content, source })))
      .returning();
  });
}

/** Menghapus satu potongan konteks bisnis. */
export async function deleteKnowledgeChunk(
  db: Database,
  businessId: string,
  chunkId: string,
): Promise<boolean> {
  if (!isUuid(chunkId)) {
    return false;
  }

  const removed = await db
    .delete(knowledgeChunks)
    .where(
      and(eq(knowledgeChunks.businessId, businessId), eq(knowledgeChunks.id, chunkId)),
    )
    .returning();

  return removed.length > 0;
}
