import { asc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { businesses, type Business } from "../db/schema";
import { isUuid } from "./ids";

/** Keadaan koneksi nomor WhatsApp, diambil dari skema. */
export type ChannelStatus = Business["channelStatus"];

/** Data profil yang dapat diisi pemilik tanpa login. */
export type BusinessProfileFields = {
  readonly ownerName?: string | null;
  readonly businessType?: string | null;
  readonly address?: string | null;
  readonly phoneNumber?: string | null;
  readonly description?: string | null;
};

/** Perubahan data pokok warung. */
export type BusinessProfileInput = BusinessProfileFields & {
  readonly name?: string;
  readonly opensAt?: string | null;
  readonly closesAt?: string | null;
};

/** Hasil pemeriksaan koneksi nomor WhatsApp. */
export type BusinessChannelInput = {
  readonly status: ChannelStatus;
  readonly phoneNumber: string | null;
  readonly connectedAt: Date | null;
  readonly packageName: string | null;
  readonly quota: number | null;
  readonly checkedAt: Date;
};

/*
 * Demo ini melayani satu warung, jadi baris pertama adalah warung yang sedang
 * dipakai. Fungsi ini tetap menerima `db` supaya pengujian dapat memakai basis
 * data sendiri.
 */

/** Mengambil warung yang sedang dipakai. Kosong bila data awal belum dijalankan. */
export async function getCurrentBusiness(db: Database): Promise<Business | undefined> {
  const [business] = await db
    .select()
    .from(businesses)
    .orderBy(asc(businesses.createdAt))
    .limit(1);

  return business;
}

/** Mengambil warung berdasarkan kuncinya. */
export async function findBusiness(
  db: Database,
  businessId: string,
): Promise<Business | undefined> {
  if (!isUuid(businessId)) {
    return undefined;
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business;
}

/** Data pokok warung baru. */
export type BusinessInput = BusinessProfileFields & {
  readonly name: string;
  readonly opensAt?: string | null;
  readonly closesAt?: string | null;
};

/** Membuat warung baru. Keadaan kanal WhatsApp mulai dari belum diatur. */
export async function createBusiness(
  db: Database,
  input: BusinessInput,
): Promise<Business> {
  const [business] = await db
    .insert(businesses)
    .values({
      name: input.name,
      ownerName: input.ownerName?.trim() || null,
      businessType: input.businessType?.trim() || null,
      address: input.address?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      description: input.description?.trim() || null,
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
    })
    .returning();

  if (business === undefined) {
    throw new Error("Warung gagal dibuat");
  }

  return business;
}

/**
 * Menghapus seluruh warung beserta datanya.
 *
 * Dipakai oleh penyiapan data demo, supaya keadaan awal selalu sama setiap
 * `npm run db:seed` dijalankan. Baris pada tabel lain ikut terhapus lewat
 * kunci asing bertingkat yang menunjuk ke `businesses.id`.
 */
export async function deleteAllBusinesses(db: Database): Promise<number> {
  const removed = await db.delete(businesses).returning();

  return removed.length;
}

/** Mengubah profil pemilik dan warung. Hanya field yang dikirim yang diubah. */
export async function updateBusinessProfile(
  db: Database,
  businessId: string,
  input: BusinessProfileInput,
): Promise<Business | undefined> {
  const values: {
    name?: string;
    ownerName?: string | null;
    businessType?: string | null;
    address?: string | null;
    phoneNumber?: string | null;
    description?: string | null;
    opensAt?: string | null;
    closesAt?: string | null;
  } = {};

  if (input.name !== undefined) values.name = input.name.trim();
  if (input.ownerName !== undefined) values.ownerName = input.ownerName?.trim() || null;
  if (input.businessType !== undefined)
    values.businessType = input.businessType?.trim() || null;
  if (input.address !== undefined) values.address = input.address?.trim() || null;
  if (input.phoneNumber !== undefined)
    values.phoneNumber = input.phoneNumber?.trim() || null;
  if (input.description !== undefined)
    values.description = input.description?.trim() || null;
  if (input.opensAt !== undefined) values.opensAt = input.opensAt;
  if (input.closesAt !== undefined) values.closesAt = input.closesAt;

  const [business] = await db
    .update(businesses)
    .set(values)
    .where(eq(businesses.id, businessId))
    .returning();

  return business;
}

/** Menyimpan hasil pemeriksaan koneksi nomor WhatsApp. */
export async function updateBusinessChannel(
  db: Database,
  businessId: string,
  input: BusinessChannelInput,
): Promise<Business | undefined> {
  const [business] = await db
    .update(businesses)
    .set({
      channelStatus: input.status,
      channelPhoneNumber: input.phoneNumber,
      channelConnectedAt: input.connectedAt,
      channelPackage: input.packageName,
      channelQuota: input.quota,
      channelCheckedAt: input.checkedAt,
    })
    .where(eq(businesses.id, businessId))
    .returning();

  return business;
}
