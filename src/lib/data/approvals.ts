import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  approvals,
  agentSessions,
  products,
  purchaseOrders,
  purchaseOrderItems,
  type Approval,
  type PurchaseOrder,
} from "../db/schema";
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

    await tx
      .update(agentSessions)
      .set({ lockStatus: "bebas", pendingApprovalId: null })
      .where(
        and(
          eq(agentSessions.businessId, businessId),
          eq(agentSessions.pendingApprovalId, approvalId),
        ),
      );
    return approval;
  });
}

export type ApprovalDetails = {
  readonly approval: Approval;
  readonly order: PurchaseOrder;
  readonly items: readonly {
    id: string;
    productId: string;
    name: string;
    unit: string;
    quantity: number;
    estimatedPrice: number;
  }[];
};
export async function getApprovalDetails(
  db: Database,
  businessId: string,
  approvalId: string,
): Promise<ApprovalDetails | undefined> {
  const approval = await findApproval(db, businessId, approvalId);
  if (!approval) return undefined;
  const id = readPurchaseOrderId(approval.payload);
  if (!id || !isUuid(id)) return undefined;
  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.businessId, businessId), eq(purchaseOrders.id, id)));
  if (!order) return undefined;
  const items = await db
    .select({
      id: purchaseOrderItems.id,
      productId: products.id,
      name: products.name,
      unit: products.unit,
      quantity: purchaseOrderItems.quantity,
      estimatedPrice: purchaseOrderItems.estimatedPrice,
    })
    .from(purchaseOrderItems)
    .innerJoin(
      products,
      and(
        eq(products.businessId, businessId),
        eq(products.id, purchaseOrderItems.productId),
      ),
    )
    .where(
      and(
        eq(purchaseOrderItems.businessId, businessId),
        eq(purchaseOrderItems.purchaseOrderId, id),
      ),
    );
  return { approval, order, items };
}
export async function listApprovalDetails(
  db: Database,
  businessId: string,
  status?: Approval["status"],
): Promise<ApprovalDetails[]> {
  const rows = await listApprovals(db, businessId, status);
  const details = await Promise.all(
    rows.map((row) => getApprovalDetails(db, businessId, row.id)),
  );
  return details.filter((row): row is ApprovalDetails => row !== undefined);
}
export class ApprovalError extends Error {}
/** Kunci produk menyerialkan permintaan draft alert yang berbarengan. */
export async function draftFromStockAlert(
  db: Database,
  businessId: string,
  productId: string,
): Promise<Approval> {
  if (!isUuid(productId)) throw new ApprovalError("Produk tidak ditemukan");
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.id, productId),
          isNull(products.archivedAt),
        ),
      )
      .for("update");
    if (!product) throw new ApprovalError("Produk tidak ditemukan atau sudah diarsipkan");
    if (product.stock >= product.minimumStock || product.minimumStock <= 0)
      throw new ApprovalError("Stok produk masih mencukupi ambang minimum");
    const pending = await tx
      .select({ approval: approvals, orderId: purchaseOrders.id })
      .from(approvals)
      .innerJoin(
        purchaseOrders,
        and(
          eq(purchaseOrders.businessId, businessId),
          sql`${approvals.payload}->>'purchaseOrderId' = cast(${purchaseOrders.id} as text)`,
        ),
      )
      .innerJoin(
        purchaseOrderItems,
        and(
          eq(purchaseOrderItems.businessId, businessId),
          eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id),
        ),
      )
      .where(
        and(
          eq(approvals.businessId, businessId),
          eq(approvals.status, "menunggu"),
          eq(purchaseOrderItems.productId, productId),
        ),
      );
    if (pending[0]) return pending[0].approval;
    const [last] = await tx
      .select({ supplierName: purchaseOrders.supplierName })
      .from(purchaseOrders)
      .innerJoin(
        purchaseOrderItems,
        and(
          eq(purchaseOrderItems.businessId, businessId),
          eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id),
        ),
      )
      .where(
        and(
          eq(purchaseOrders.businessId, businessId),
          eq(purchaseOrderItems.productId, productId),
        ),
      )
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(1);
    const quantity = Math.max(
      product.minimumStock,
      2 * product.minimumStock - product.stock,
    );
    if (quantity > 2147483647 || quantity * product.purchasePrice > 2147483647)
      throw new ApprovalError("Nilai pesanan pembelian terlalu besar");
    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        businessId,
        supplierName: last?.supplierName ?? "Belum ditentukan",
        total: quantity * product.purchasePrice,
      })
      .returning();
    if (!order) throw new ApprovalError("Draft pesanan pembelian gagal dibuat");
    await tx
      .insert(purchaseOrderItems)
      .values({
        businessId,
        purchaseOrderId: order.id,
        productId,
        quantity,
        estimatedPrice: product.purchasePrice,
      });
    const [approval] = await tx
      .insert(approvals)
      .values({
        businessId,
        kind: "purchase_order",
        summary: `Tambah stok ${product.name} sebanyak ${quantity} ${product.unit}`,
        payload: { purchaseOrderId: order.id },
      })
      .returning();
    if (!approval) throw new ApprovalError("Persetujuan gagal dibuat");
    return approval;
  });
}
