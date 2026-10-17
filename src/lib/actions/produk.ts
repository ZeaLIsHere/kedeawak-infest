"use server";
import { revalidatePath } from "next/cache";
import {
  saveProduct as persistProduct,
  archiveProduct,
  restoreProduct,
} from "../data/products";
import { withCurrentBusiness } from "../data/server";
import {
  integerField,
  textField,
  safeActionError,
  type ActionFailure,
} from "./validation";
function refreshProducts(): void {
  for (const path of ["/kasir", "/stok", "/laporan", "/"]) revalidatePath(path);
}
export async function saveProductAction(
  formData: FormData,
): Promise<{ ok: true; productId: string } | ActionFailure> {
  try {
    const idValue = formData.get("id");
    const reasonValue = formData.get("reason");
    const input = {
      name: textField(formData, "name"),
      unit: textField(formData, "unit"),
      salePrice: integerField(formData, "salePrice"),
      purchasePrice: integerField(formData, "purchasePrice"),
      minimumStock: integerField(formData, "minimumStock"),
      stock: integerField(formData, "stock"),
      ...(typeof idValue === "string" && idValue.trim() ? { id: idValue.trim() } : {}),
      ...(typeof reasonValue === "string" ? { reason: reasonValue.trim() } : {}),
    };
    const product = await withCurrentBusiness((db, id) => persistProduct(db, id, input));
    if (!product) return { ok: false, error: "Warung belum tersedia" };
    refreshProducts();
    return { ok: true, productId: product.id };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
export async function saveProduct(
  formData: FormData,
): Promise<{ ok: true; productId: string } | ActionFailure> {
  return saveProductAction(formData);
}
export async function archiveProductAction(
  productId: string,
): Promise<{ ok: true } | ActionFailure> {
  try {
    const product = await withCurrentBusiness((db, id) =>
      archiveProduct(db, id, productId),
    );
    if (!product) return { ok: false, error: "Produk tidak ditemukan" };
    refreshProducts();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
export async function restoreProductAction(
  productId: string,
): Promise<{ ok: true } | ActionFailure> {
  try {
    const product = await withCurrentBusiness((db, id) =>
      restoreProduct(db, id, productId),
    );
    if (!product) return { ok: false, error: "Produk tidak ditemukan" };
    refreshProducts();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
