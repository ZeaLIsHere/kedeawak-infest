"use server";

import { revalidatePath } from "next/cache";

import { withCurrentBusiness } from "@/lib/data/server";
import { createTransaction } from "@/lib/data/transactions";

import {
  integerField,
  safeActionError,
  textField,
  ValidationError,
  type ActionFailure,
} from "./validation";

type ExpenseResult = { readonly ok: true; readonly amount: number } | ActionFailure;

const FORBIDDEN = /[\p{Extended_Pictographic}\u002d\u2010-\u2015\u2212]/u;

/** Menyimpan pengeluaran manual dari halaman Laporan. */
export async function createExpenseAction(form: FormData): Promise<ExpenseResult> {
  try {
    const description = textField(form, "description");
    if (description.length > 200) {
      throw new ValidationError("Keterangan pengeluaran maksimal 200 karakter");
    }
    if (FORBIDDEN.test(description)) {
      throw new ValidationError(
        "Keterangan pengeluaran tidak boleh memakai emoji atau tanda hubung",
      );
    }

    const amount = integerField(form, "amount");
    if (amount === 0) {
      throw new ValidationError("Nominal pengeluaran harus lebih dari nol");
    }

    const dateValue = form.get("occurredAt");
    let occurredAt: Date | undefined;
    if (typeof dateValue === "string" && dateValue.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateValue)) {
        throw new ValidationError("Tanggal pengeluaran belum sesuai");
      }
      const parsed = new Date(`${dateValue}T12:00:00+07:00`);
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError("Tanggal pengeluaran belum sesuai");
      }
      occurredAt = parsed;
    }

    const transaction = await withCurrentBusiness((db, id) =>
      createTransaction(db, id, {
        kind: "expense",
        description,
        amount,
        source: "app",
        ...(occurredAt === undefined ? {} : { occurredAt }),
      }),
    );

    if (!transaction) return { ok: false, error: "Data warung belum tersedia" };

    for (const path of ["/laporan", "/", "/percakapan"]) {
      revalidatePath(path);
    }

    return { ok: true, amount: transaction.amount };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
