"use server";
import { revalidatePath } from "next/cache";
import { withCurrentBusiness } from "../data/server";
import { createSale, type SaleInput } from "../data/sales";
import { safeActionError, type ActionFailure } from "./validation";
export async function createSaleAction(
  input: SaleInput,
): Promise<{ ok: true; orderId: string; total: number } | ActionFailure> {
  try {
    const result = await withCurrentBusiness((db, id) => createSale(db, id, input));
    if (!result) return { ok: false, error: "Warung belum tersedia" };
    for (const path of ["/kasir", "/stok", "/laporan", "/"]) revalidatePath(path);
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
