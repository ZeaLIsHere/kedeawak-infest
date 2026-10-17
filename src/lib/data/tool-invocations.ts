import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { toolInvocations, type ToolInvocation } from "../db/schema";
import { isUuid } from "./ids";

/*
 * Jejak audit setiap pemanggilan tool.
 *
 * Pencatatan dilakukan dua tahap, yaitu saat tool dipanggil dan saat hasilnya
 * diketahui. Dengan begitu pemanggilan yang gagal di tengah jalan tetap
 * meninggalkan jejak, dan tidak ada pemanggilan yang hilang dari catatan.
 */

/** Data pemanggilan satu tool. */
export type ToolInvocationInput = {
  readonly sessionId?: string | null;
  readonly toolName: string;
  readonly arguments: unknown;
};

/** Hasil sebuah pemanggilan tool. */
export type ToolInvocationResult = {
  readonly result: unknown;
  readonly failed: boolean;
};

/** Penyaring daftar pemanggilan tool. */
export type ToolInvocationFilter = {
  readonly sessionId?: string;
  readonly limit?: number;
};

/** Mencatat bahwa sebuah tool mulai dipanggil. */
export async function recordToolInvocation(
  db: Database,
  businessId: string,
  input: ToolInvocationInput,
): Promise<ToolInvocation> {
  const [invocation] = await db
    .insert(toolInvocations)
    .values({
      businessId,
      sessionId: input.sessionId ?? null,
      toolName: input.toolName,
      arguments: input.arguments,
    })
    .returning();

  if (invocation === undefined) {
    throw new Error("Pemanggilan tool gagal dicatat");
  }

  return invocation;
}

/** Melengkapi catatan pemanggilan tool dengan hasilnya. */
export async function completeToolInvocation(
  db: Database,
  businessId: string,
  invocationId: string,
  input: ToolInvocationResult,
): Promise<ToolInvocation | undefined> {
  if (!isUuid(invocationId)) {
    return undefined;
  }

  const [invocation] = await db
    .update(toolInvocations)
    .set({ result: input.result, failed: input.failed })
    .where(
      and(
        eq(toolInvocations.businessId, businessId),
        eq(toolInvocations.id, invocationId),
      ),
    )
    .returning();

  return invocation;
}

/** Jejak pemanggilan tool, yang paling baru lebih dulu. */
export async function listToolInvocations(
  db: Database,
  businessId: string,
  filter: ToolInvocationFilter = {},
): Promise<ToolInvocation[]> {
  const conditions = [eq(toolInvocations.businessId, businessId)];

  if (filter.sessionId !== undefined) {
    conditions.push(eq(toolInvocations.sessionId, filter.sessionId));
  }

  const query = db
    .select()
    .from(toolInvocations)
    .where(and(...conditions))
    .orderBy(desc(toolInvocations.createdAt));

  return filter.limit === undefined ? query : query.limit(filter.limit);
}
