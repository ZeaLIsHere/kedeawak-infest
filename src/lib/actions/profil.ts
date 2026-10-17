"use server";

import { revalidatePath } from "next/cache";

import { updateBusinessProfile } from "@/lib/data/business";
import { withCurrentBusiness } from "@/lib/data/server";

import { safeActionError, ValidationError, type ActionFailure } from "./validation";

type ProfileSaveResult = { readonly ok: true } | ActionFailure;

const FORBIDDEN = /[\p{Extended_Pictographic}\u002d\u2010-\u2015\u2212]/u;

function requiredText(form: FormData, key: string, max: number): string {
  const value = form.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Nama usaha wajib diisi");
  }

  return optionalText(form, key, max) ?? "";
}

function optionalText(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);

  if (typeof value !== "string") return null;

  const trimmed = value.replace(/\s+/gu, " ").trim();

  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new ValidationError("Isian profil melebihi panjang yang diperbolehkan");
  }
  if (FORBIDDEN.test(trimmed)) {
    throw new ValidationError("Isian profil tidak boleh memakai emoji atau tanda hubung");
  }

  return trimmed;
}

function phoneField(form: FormData): string | null {
  const value = form.get("phoneNumber");
  if (typeof value !== "string" || !value.trim()) return null;

  const digits = value.replace(/\D/gu, "");

  if (digits.length < 8 || digits.length > 15) {
    throw new ValidationError("Nomor telepon harus berisi 8 sampai 15 angka");
  }

  return digits;
}

function timeField(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim()) return null;

  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/u.exec(value.trim());
  const hour = Number(match?.[1]);
  const minute = Number(match?.[2]);
  const second = match?.[3] === undefined ? 0 : Number(match[3]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new ValidationError("Jam harus memakai format 00:00 sampai 23:59");
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(
    second,
  ).padStart(2, "0")}`;
}

/** Menyimpan profil pemilik dan usaha dari halaman Pengaturan. */
export async function saveBusinessProfileAction(
  form: FormData,
): Promise<ProfileSaveResult> {
  try {
    const updated = await withCurrentBusiness((db, id) =>
      updateBusinessProfile(db, id, {
        name: requiredText(form, "name", 120),
        ownerName: optionalText(form, "ownerName", 80),
        businessType: optionalText(form, "businessType", 80),
        address: optionalText(form, "address", 200),
        phoneNumber: phoneField(form),
        description: optionalText(form, "description", 500),
        opensAt: timeField(form, "opensAt"),
        closesAt: timeField(form, "closesAt"),
      }),
    );

    if (!updated) return { ok: false, error: "Data warung belum tersedia" };

    for (const path of ["/pengaturan", "/percakapan", "/"]) {
      revalidatePath(path);
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}
