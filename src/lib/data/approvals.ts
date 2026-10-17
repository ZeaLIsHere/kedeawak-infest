import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { approvals, type Approval } from "../db/schema";
import { isUuid } from "./ids";
import { assertPurchaseOrderOwned } from "./ownership";
import { applyPurchaseOrderDecision } from "./purchase-orders";

/**
 * Muatan sebuah aksi yang menunggu persetujuan.
 *
 * Aksi pesanan pembelian menyimpan kunci draftnya, supaya aksi dapat
 * dijalankan setelah pemilik menyetujuinya.
 */
export type PurchaseOrderApprovalPayload = {
  readonly purchaseOrderId: string;
};

/** Keputusan yang dapat diambil pemilik atas sebuah aksi. */
export type ApprovalDecision = Extract<Approval["status"], "disetujui" | "ditolak">;

/** Data pengajuan satu aksi ke antrean persetujuan. */
export type ApprovalInput = {
  readonly purchaseOrderId: string;
  /** Ringkasan berbahasa Indonesia yang dibaca pemilik pada permukaan S6. */
  readonly summary: string;
};

/** Membaca kunci draft dari muatan aksi yang tersimpan sebagai jsonb. */
export function readPurchaseOrderId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const value = (payload as { readonly purchaseOrderId?: unknown }).purchaseOrderId;

  return typeof value === "string" ? value : undefined;
}

/**
 * Mengajukan sebuah draft pesanan pembelian ke antrean persetujuan.
 *
 * Ringkasan ditulis oleh pemanggil, karena hanya lapisan agen yang tahu
 * kalimat yang pantas dibaca pemilik.
 */
export async function createApproval(
  db: Database,
  businessId: string,
  input: ApprovalInput,
): Promise<Approval> {
  return db.transaction(async (tx) => {
    await assertPurchaseOrderOwned(tx, businessId, input.purchaseOrderId);

    const payload: PurchaseOrderApprovalPayload = {
      purchaseOrderId: input.purchaseOrderId,
    };

    const [approval] = await tx
      .insert(approvals)
      .values({
        businessId,
        kind: "purchase_order",
        payload,
        summary: input.summary,
      })
      .returning();

    if (approval === undefined) {
      throw new Error("Aksi gagal diajukan ke antrean persetujuan");
    }

    return approval;
  });
}

/** Mengambil satu aksi pada antrean persetujuan. */
export async function findApproval(
  db: Database,
  businessId: string,
  approvalId: string,
): Promise<Approval | undefined> {
  if (!isUuid(approvalId)) {
    return undefined;
  }

  const [approval] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.businessId, businessId), eq(approvals.id, approvalId)))
    .limit(1);

  return approval;
}

/** Daftar aksi pada antrean persetujuan, yang paling baru lebih dulu. */
export async function listApprovals(
  db: Database,
  businessId: string,
  status?: Approval["status"],
): Promise<Approval[]> {
  const conditions = [eq(approvals.businessId, businessId)];

  if (status !== undefined) {
    conditions.push(eq(approvals.status, status));
  }

  return db
    .select()
    .from(approvals)
    .where(and(...conditions))
    .orderBy(desc(approvals.createdAt));
}

/** Jumlah aksi pada antrean persetujuan, secara bawaan yang masih menunggu. */
export async function countApprovals(
  db: Database,
  businessId: string,
  status: Approval["status"] = "menunggu",
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(approvals)
    .where(and(eq(approvals.businessId, businessId), eq(approvals.status, status)));

  return row?.total ?? 0;
}

/**
 * Memutuskan sebuah aksi pada antrean persetujuan.
 *
 * Aksi yang terkait dikerjakan di dalam transaksi yang sama, sehingga tidak ada
 * aksi yang sudah disetujui tetapi belum berlaku. Aksi yang sudah diputuskan
 * menjawab kosong, dan tidak ada yang berubah.
 */
export async function decideApproval(
  db: Database,
  businessId: string,
  approvalId: string,
  decision: ApprovalDecision,
): Promise<Approval | undefined> {
  if (!isUuid(approvalId)) {
    return undefined;
  }

  return db.transaction(async (tx) => {
    const [approval] = await tx
      .update(approvals)
      .set({ status: decision, decidedAt: new Date() })
      .where(
        and(
          eq(approvals.businessId, businessId),
          eq(approvals.id, approvalId),
          eq(approvals.status, "menunggu"),
        ),
      )
      .returning();

    if (approval === undefined) {
      return undefined;
    }

    if (approval.kind === "purchase_order") {
      const purchaseOrderId = readPurchaseOrderId(approval.payload);

      if (purchaseOrderId === undefined) {
        throw new Error("Muatan aksi pesanan pembelian tidak memuat kunci draft");
      }

      const decided = await applyPurchaseOrderDecision(
        tx,
        businessId,
        purchaseOrderId,
        decision,
      );

      /*
       * Draft yang tidak lagi berstatus draft berarti keadaannya tidak sesuai
       * dengan antrean. Seluruh transaksi dibatalkan supaya tidak ada keputusan
       * yang separuh berlaku.
       */
      if (decided === undefined) {
        throw new Error("Draft pesanan pembelian tidak berada pada keadaan draft");
      }
    }

    return approval;
  });
}
