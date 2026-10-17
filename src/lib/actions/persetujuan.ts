"use server";
import { revalidatePath } from "next/cache";
import {
  decideApproval,
  draftFromStockAlert,
  type ApprovalDecision,
} from "../data/approvals";
import { withCurrentBusiness } from "../data/server";
import { safeActionError, type ActionFailure } from "./validation";
function refreshApprovals(): void {
  for (const path of ["/persetujuan", "/stok", "/kasir", "/laporan", "/percakapan", "/"])
    revalidatePath(path);
}
export async function decideApprovalAction(
  approvalId: string,
  decision: ApprovalDecision,
): Promise<{ ok: true; approvalId: string } | ActionFailure> {
  if (decision !== "disetujui" && decision !== "ditolak")
    return { ok: false, error: "Pilih keputusan yang tersedia" };
  try {
    const result = await withCurrentBusiness((db, id) =>
      decideApproval(db, id, approvalId, decision),
    );
    if (!result)
      return { ok: false, error: "Persetujuan tidak ditemukan atau sudah diputuskan" };
    refreshApprovals();
    return { ok: true, approvalId: result.id };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
export async function draftFromAlertAction(
  productId: string,
): Promise<{ ok: true; approvalId: string } | ActionFailure> {
  try {
    const result = await withCurrentBusiness((db, id) =>
      draftFromStockAlert(db, id, productId),
    );
    if (!result) return { ok: false, error: "Warung belum tersedia" };
    refreshApprovals();
    return { ok: true, approvalId: result.id };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
