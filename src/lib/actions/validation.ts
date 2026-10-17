import { ProductError } from "../data/products";
import { SaleError } from "../data/sales";
import { ApprovalError } from "../data/approvals";
export class ValidationError extends Error {}
export type ActionFailure = { readonly ok: false; readonly error: string };
export function textField(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim())
    throw new ValidationError("Lengkapi seluruh kolom wajib");
  return value.trim();
}
export function integerField(form: FormData, key: string): number {
  const value = textField(form, key);
  if (!/^\d+$/u.test(value))
    throw new ValidationError("Isi angka bulat nol atau lebih tanpa pemisah ribuan");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647)
    throw new ValidationError("Angka melebihi batas yang diperbolehkan");
  return parsed;
}
export function safeActionError(error: unknown): string {
  if (
    error instanceof ValidationError ||
    error instanceof ProductError ||
    error instanceof SaleError ||
    error instanceof ApprovalError
  )
    return error.message;
  return "Perubahan belum tersimpan. Silakan coba kembali";
}
