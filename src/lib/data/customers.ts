import { and, asc, eq, inArray } from "drizzle-orm";

import { getFieldCipher } from "../crypto/field-encryption";
import type { Database } from "../db/client";
import { conversations, customers, messages, orders, payments, transactions, type Customer } from "../db/schema";
import { isUuid } from "./ids";

/** Nama dan nomor telepon pelanggan dalam bentuk terbuka. */
export type CustomerIdentity = {
  readonly name: string | null;
  readonly phoneNumber: string;
};

/*
 * Nama dan nomor telepon tidak pernah disimpan dalam bentuk terbuka, sesuai
 * `docs/ARCHITECTURE.md` bagian 8 butir 1. Pencarian memakai sidik jari nomor,
 * bukan nomornya, sesuai aturan skema bagian 4 butir 7.
 */

/** Sidik jari nomor telepon, dipakai sebagai pencocok pelanggan. */
export function phoneHash(phoneNumber: string): string {
  return getFieldCipher().hashPhoneNumber(phoneNumber);
}

/** Mencari pelanggan menurut nomor teleponnya. */
export async function findCustomerByPhone(
  db: Database,
  businessId: string,
  phoneNumber: string,
): Promise<Customer | undefined> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.businessId, businessId),
        eq(customers.phoneNumberHash, phoneHash(phoneNumber)),
      ),
    )
    .limit(1);

  return customer;
}

/** Mengambil satu pelanggan menurut kuncinya. */
export async function findCustomer(
  db: Database,
  businessId: string,
  customerId: string,
): Promise<Customer | undefined> {
  if (!isUuid(customerId)) {
    return undefined;
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.id, customerId)))
    .limit(1);

  return customer;
}

/** Seluruh pelanggan warung, diurutkan menurut waktu pendaftaran. */
export async function listCustomers(
  db: Database,
  businessId: string,
): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy(asc(customers.createdAt));
}

/** Menambah pelanggan baru. */
export async function createCustomer(
  db: Database,
  businessId: string,
  identity: CustomerIdentity,
): Promise<Customer> {
  const cipher = getFieldCipher();
  const [customer] = await db
    .insert(customers)
    .values({
      businessId,
      nameEncrypted: identity.name === null ? null : cipher.encrypt(identity.name),
      phoneNumberEncrypted: cipher.encrypt(identity.phoneNumber),
      phoneNumberHash: cipher.hashPhoneNumber(identity.phoneNumber),
    })
    .returning();

  if (customer === undefined) {
    throw new Error("Pelanggan gagal dibuat");
  }

  return customer;
}

/**
 * Mengambil pelanggan menurut nomornya, atau membuatnya bila belum ada.
 * Dipakai saat pesan masuk datang dari nomor yang belum dikenal.
 */
export async function findOrCreateCustomer(
  db: Database,
  businessId: string,
  identity: CustomerIdentity,
): Promise<Customer> {
  const cipher = getFieldCipher();
  const hash = cipher.hashPhoneNumber(identity.phoneNumber);
  const [created] = await db
    .insert(customers)
    .values({
      businessId,
      nameEncrypted: identity.name === null ? null : cipher.encrypt(identity.name),
      phoneNumberEncrypted: cipher.encrypt(identity.phoneNumber),
      phoneNumberHash: hash,
    })
    .onConflictDoNothing({ target: [customers.businessId, customers.phoneNumberHash] })
    .returning();

  if (created !== undefined) {
    return created;
  }

  const existing = await findCustomerByPhone(db, businessId, identity.phoneNumber);

  if (existing === undefined) {
    throw new Error("Pelanggan tidak ditemukan setelah penulisan");
  }

  return existing;
}

/** Mengubah nama dan nomor telepon pelanggan. */
export async function updateCustomer(
  db: Database,
  businessId: string,
  customerId: string,
  identity: CustomerIdentity,
): Promise<Customer | undefined> {
  const cipher = getFieldCipher();
  const [customer] = await db
    .update(customers)
    .set({
      nameEncrypted: identity.name === null ? null : cipher.encrypt(identity.name),
      phoneNumberEncrypted: cipher.encrypt(identity.phoneNumber),
      phoneNumberHash: cipher.hashPhoneNumber(identity.phoneNumber),
    })
    .where(and(eq(customers.businessId, businessId), eq(customers.id, customerId)))
    .returning();

  return customer;
}

/**
 * Menghapus data pelanggan, sesuai `docs/SCOPE.md` bagian 3.3.
 *
 * Baris pelanggan beserta nama dan nomor terenkripsinya dihapus, dan rujukan
 * pelanggan pada percakapan dikosongkan. Sidik jari nomor pada percakapan tetap
 * ada supaya riwayat percakapan tidak pecah, dan sidik jari itu tidak dapat
 * dibalik menjadi nomor tanpa kunci enkripsi.
 */
export async function deleteCustomerData(
  db: Database,
  businessId: string,
  customerId: string,
): Promise<boolean> {
  if (!isUuid(customerId)) return false;
  return db.transaction(async (tx) => {
    const owned = await findCustomer(tx, businessId, customerId);
    if (!owned) return false;
    const linked = await tx.select({id:conversations.id}).from(conversations).where(and(eq(conversations.businessId,businessId),eq(conversations.customerId,customerId)));
    if (linked.length) await tx.update(messages).set({body:null,mediaUrl:null}).where(and(eq(messages.businessId,businessId),inArray(messages.conversationId,linked.map(row=>row.id))));
    const linkedOrders=await tx.select({id:orders.id}).from(orders).where(and(eq(orders.businessId,businessId),eq(orders.customerId,customerId)));
    if (linkedOrders.length) await tx.update(payments).set({proofUrl:null}).where(and(eq(payments.businessId,businessId),inArray(payments.orderId,linkedOrders.map(row=>row.id))));
    await tx.update(transactions).set({proofUrl:null,description:"Catatan transaksi pelanggan"}).where(and(eq(transactions.businessId,businessId),eq(transactions.customerId,customerId)));
    await tx
      .update(conversations)
      .set({ customerId: null })
      .where(
        and(
          eq(conversations.businessId, businessId),
          eq(conversations.customerId, customerId),
        ),
      );

    const removed = await tx
      .delete(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.id, customerId)))
      .returning();

    return removed.length > 0;
  });
}

/** Membuka nama pelanggan dari barisnya. */
export function readCustomerName(customer: Customer): string | null {
  return customer.nameEncrypted === null
    ? null
    : getFieldCipher().decrypt(customer.nameEncrypted);
}

/** Membuka nomor telepon pelanggan dari barisnya. */
export function readCustomerPhone(customer: Customer): string {
  return getFieldCipher().decrypt(customer.phoneNumberEncrypted);
}
