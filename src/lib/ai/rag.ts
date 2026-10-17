import type { Database } from "../db/client";
import { findBusiness } from "../data/business";
import { listKnowledgeChunks } from "../data/knowledge";
import { listProducts } from "../data/products";
import { summarizeDay, summarizeWeek } from "../data/reports";

/**
 * Konteks bisnis yang dipakai agen. Profil pemilik ikut dikirim supaya agen
 * menyapa pemilik dengan data yang benar, bukan nama pelanggan dari riwayat.
 */
export async function getBusinessContext(db: Database, businessId: string) {
  const [business, products, knowledge, day, week] = await Promise.all([
    findBusiness(db, businessId),
    listProducts(db, businessId),
    listKnowledgeChunks(db, businessId),
    summarizeDay(db, businessId),
    summarizeWeek(db, businessId),
  ]);

  if (!business) throw new Error("Warung belum tersedia");

  return {
    business: {
      name: business.name,
      ownerName: business.ownerName,
      businessType: business.businessType,
      address: business.address,
      phoneNumber: business.phoneNumber,
      description: business.description,
      opensAt: business.opensAt,
      closesAt: business.closesAt,
    },
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      salePrice: product.salePrice,
      minimumStock: product.minimumStock,
    })),
    knowledge: knowledge.map((chunk) => chunk.content),
    day,
    week,
  };
}
