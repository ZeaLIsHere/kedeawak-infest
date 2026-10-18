"use server";

import { revalidatePath } from "next/cache";

import {
  activateGoldSubscription,
  cancelSubscription,
  readSubscription,
} from "@/lib/data/subscription";
import { withCurrentBusiness } from "@/lib/data/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

function refresh() {
  for (const path of ["/pengaturan", "/whatsapp", "/percakapan"]) {
    revalidatePath(path);
  }
}

/** Membeli paket Gold. Pembayaran pada demo ini hanya berupa konfirmasi. */
export async function purchaseGoldAction(): Promise<Result> {
  try {
    const current = await withCurrentBusiness((db, businessId) =>
      readSubscription(db, businessId),
    );
    if (current === undefined) {
      return { ok: false, error: "Data warung belum tersedia." };
    }
    if (current.active) {
      return { ok: false, error: "Paket Gold masih aktif." };
    }

    const updated = await withCurrentBusiness((db, businessId) =>
      activateGoldSubscription(db, businessId),
    );
    if (updated === undefined) {
      return { ok: false, error: "Langganan belum dapat diaktifkan. Coba lagi." };
    }

    refresh();
    return { ok: true, message: "Paket Gold aktif selama 30 hari." };
  } catch {
    return { ok: false, error: "Langganan belum dapat diaktifkan. Coba lagi." };
  }
}

/** Mengembalikan warung ke paket Free. */
export async function removeSubscriptionAction(): Promise<Result> {
  try {
    const updated = await withCurrentBusiness((db, businessId) =>
      cancelSubscription(db, businessId),
    );
    if (updated === undefined) {
      return { ok: false, error: "Data warung belum tersedia." };
    }

    refresh();
    return { ok: true, message: "Langganan dihapus. Warung kembali ke paket Free." };
  } catch {
    return { ok: false, error: "Langganan belum dapat dihapus. Coba lagi." };
  }
}
