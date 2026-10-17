import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { agentSessions, type AgentSession } from "../db/schema";
import { isUuid } from "./ids";
import { assertConversationOwned } from "./ownership";

/*
 * Sesi agen memuat kunci konteks, yaitu penanda bahwa percakapan sedang
 * menunggu persetujuan pemilik. Selama kunci terpasang, pesan berikutnya tidak
 * dianggap transaksi baru. Tabel ini menggantikan Redis, sesuai
 * `docs/ARCHITECTURE.md` bagian 2 catatan 1.
 */

/** Mengambil satu sesi agen. */
export async function findSession(
  db: Database,
  businessId: string,
  sessionId: string,
): Promise<AgentSession | undefined> {
  if (!isUuid(sessionId)) {
    return undefined;
  }

  const [session] = await db
    .select()
    .from(agentSessions)
    .where(and(eq(agentSessions.businessId, businessId), eq(agentSessions.id, sessionId)))
    .limit(1);

  return session;
}

/** Sesi yang terakhir dipakai pada sebuah percakapan. */
export async function findLatestSession(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<AgentSession | undefined> {
  if (!isUuid(conversationId)) {
    return undefined;
  }

  const [session] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.businessId, businessId),
        eq(agentSessions.conversationId, conversationId),
      ),
    )
    .orderBy(desc(agentSessions.createdAt))
    .limit(1);

  return session;
}

/** Membuka sesi baru untuk sebuah percakapan. */
export async function startSession(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<AgentSession> {
  return db.transaction(async (tx) => {
    await assertConversationOwned(tx, businessId, conversationId);

    const [session] = await tx
      .insert(agentSessions)
      .values({ businessId, conversationId })
      .returning();

    if (session === undefined) {
      throw new Error("Sesi agen gagal dibuka");
    }

    return session;
  });
}

/** Sesi yang dipakai sebuah percakapan, dibuka lebih dulu bila belum ada. */
export async function getOrStartSession(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<AgentSession> {
  const existing = await findLatestSession(db, businessId, conversationId);

  return existing ?? startSession(db, businessId, conversationId);
}

/** Mengunci sesi selama menunggu keputusan pemilik atas sebuah aksi. */
export async function lockSession(
  db: Database,
  businessId: string,
  sessionId: string,
  approvalId: string,
): Promise<AgentSession | undefined> {
  if (!isUuid(sessionId) || !isUuid(approvalId)) {
    return undefined;
  }

  const [session] = await db
    .update(agentSessions)
    .set({ lockStatus: "menunggu_persetujuan", pendingApprovalId: approvalId })
    .where(and(eq(agentSessions.businessId, businessId), eq(agentSessions.id, sessionId)))
    .returning();

  return session;
}

/** Melepas kunci sesi setelah aksi diputuskan. */
export async function releaseSession(
  db: Database,
  businessId: string,
  sessionId: string,
): Promise<AgentSession | undefined> {
  if (!isUuid(sessionId)) {
    return undefined;
  }

  const [session] = await db
    .update(agentSessions)
    .set({ lockStatus: "bebas", pendingApprovalId: null })
    .where(and(eq(agentSessions.businessId, businessId), eq(agentSessions.id, sessionId)))
    .returning();

  return session;
}

/** Sesi yang masih menunggu keputusan pemilik. */
export async function listLockedSessions(
  db: Database,
  businessId: string,
): Promise<AgentSession[]> {
  return db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.businessId, businessId),
        eq(agentSessions.lockStatus, "menunggu_persetujuan"),
      ),
    )
    .orderBy(desc(agentSessions.updatedAt));
}
