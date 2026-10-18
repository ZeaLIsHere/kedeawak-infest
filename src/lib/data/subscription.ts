import { and, count, eq, gte, isNotNull, lt } from "drizzle-orm";

import type { Database } from "../db/client";
import { businesses, orders } from "../db/schema";
import { isUuid } from "./ids";
import { endOfDay, startOfDay } from "./period";

/** Batas pesanan WhatsApp per hari pada paket Free. */
export const FREE_WHATSAPP_ORDER_LIMIT = 10;

/** Harga paket Gold per bulan, dalam rupiah penuh. */
export const GOLD_PRICE = 19_900;

/** Masa berlaku paket Gold. */
export const GOLD_DURATION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionTier = "free" | "gold";

/** Keadaan langganan yang sudah memperhitungkan masa berlaku. */
export type SubscriptionStatus = {
  /** Tingkat yang berlaku sekarang, bukan sekadar nilai tersimpan. */
  readonly tier: SubscriptionTier;
  readonly startedAt: Date | null;
  readonly expiresAt: Date | null;
  /** Benar bila paket Gold masih berlaku. */
  readonly active: boolean;
  readonly whatsappOrdersToday: number;
  /** `null` berarti tanpa batas. */
  readonly whatsappOrderLimit: number | null;
  /** `null` berarti tanpa batas. */
  readonly whatsappOrdersRemaining: number | null;
};

function isGoldActive(
  tier: SubscriptionTier,
  expiresAt: Date | null,
  now: Date,
): boolean {
  return tier === "gold" && expiresAt !== null && expiresAt.getTime() > now.getTime();
}

/**
 * Membaca langganan warung beserta pemakaian pesanan WhatsApp hari ini.
 *
 * Paket Gold yang sudah lewat masa berlaku diperlakukan sebagai Free tanpa
 * menulis ulang baris, supaya pembacaan tetap murni. Batas hari mengikuti
 * Waktu Indonesia Barat, sama seperti laporan dan kuota agen.
 */
export async function readSubscription(
  db: Database,
  businessId: string,
  now: Date = new Date(),
): Promise<SubscriptionStatus | undefined> {
  if (!isUuid(businessId)) {
    return undefined;
  }

  const [business] = await db
    .select({
      tier: businesses.subscriptionTier,
      startedAt: businesses.subscriptionStartedAt,
      expiresAt: businesses.subscriptionExpiresAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (business === undefined) {
    return undefined;
  }

  const [usage] = await db
    .select({ value: count() })
    .from(orders)
    .where(
      and(
        eq(orders.businessId, businessId),
        isNotNull(orders.conversationId),
        gte(orders.createdAt, startOfDay(now)),
        lt(orders.createdAt, endOfDay(now)),
      ),
    );

  const active = isGoldActive(business.tier, business.expiresAt, now);
  const whatsappOrdersToday = Number(usage?.value ?? 0);
  const limit = active ? null : FREE_WHATSAPP_ORDER_LIMIT;

  return {
    tier: active ? "gold" : "free",
    startedAt: business.startedAt,
    expiresAt: business.expiresAt,
    active,
    whatsappOrdersToday,
    whatsappOrderLimit: limit,
    whatsappOrdersRemaining:
      limit === null ? null : Math.max(0, limit - whatsappOrdersToday),
  };
}

/** Benar bila warung masih boleh menerima pesanan WhatsApp hari ini. */
export async function canAcceptWhatsAppOrder(
  db: Database,
  businessId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const status = await readSubscription(db, businessId, now);

  return (
    status !== undefined &&
    (status.whatsappOrdersRemaining === null || status.whatsappOrdersRemaining > 0)
  );
}

/** Mengaktifkan paket Gold selama 30 hari sejak waktu pembelian. */
export async function activateGoldSubscription(
  db: Database,
  businessId: string,
  now: Date = new Date(),
): Promise<SubscriptionStatus | undefined> {
  if (!isUuid(businessId)) {
    return undefined;
  }

  const expiresAt = new Date(now.getTime() + GOLD_DURATION_DAYS * DAY_MS);
  const [updated] = await db
    .update(businesses)
    .set({
      subscriptionTier: "gold",
      subscriptionStartedAt: now,
      subscriptionExpiresAt: expiresAt,
    })
    .where(eq(businesses.id, businessId))
    .returning();

  return updated === undefined ? undefined : readSubscription(db, businessId, now);
}

/** Mengembalikan warung ke paket Free dan menghapus masa berlaku Gold. */
export async function cancelSubscription(
  db: Database,
  businessId: string,
  now: Date = new Date(),
): Promise<SubscriptionStatus | undefined> {
  if (!isUuid(businessId)) {
    return undefined;
  }

  const [updated] = await db
    .update(businesses)
    .set({
      subscriptionTier: "free",
      subscriptionStartedAt: null,
      subscriptionExpiresAt: null,
    })
    .where(eq(businesses.id, businessId))
    .returning();

  return updated === undefined ? undefined : readSubscription(db, businessId, now);
}
