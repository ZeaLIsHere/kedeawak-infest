import { asc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { businesses, type Business } from "../db/schema";
import { isUuid } from "./ids";

/** Keadaan koneksi nomor WhatsApp, diambil dari skema. */
export type ChannelStatus = Business["channelStatus"];

/** Perubahan data pokok warung. */
export type BusinessProfileInput = {
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

/** Mengubah nama dan jam buka warung. */
export async function updateBusinessProfile(
  db: Database,
  businessId: string,
  input: BusinessProfileInput,
): Promise<Business | undefined> {
  const [business] = await db
    .update(businesses)
    .set(input)
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
