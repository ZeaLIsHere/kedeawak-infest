import { describe, expect, it } from "vitest";

import { createTestDatabase } from "../db/testing";
import { deleteAllBusinesses } from "./business";
import { createProduct, listProducts } from "./products";
import { withCurrentBusiness } from "./server";

/*
 * Jembatan ini yang menyediakan pegangan basis data bagi halaman, karena
 * komponen di `src/components/` dilarang menyentuh `src/lib/db/`. Pengujian
 * menyuntikkan pegangan uji lewat parameter kedua, sehingga tidak ada keadaan
 * global yang perlu diubah dan setiap pengujian tetap terpisah.
 */
describe("jembatan data halaman", () => {
  it("meneruskan pegangan dan warung berjalan ke pembaca", async () => {
    const test = await createTestDatabase();

    try {
      await createProduct(test.db, test.business.id, {
        name: "Beras Premium",
        unit: "karung",
        salePrice: 75000,
        purchasePrice: 68000,
        minimumStock: 3,
      });

      const products = await withCurrentBusiness(
        (db, businessId) => listProducts(db, businessId),
        test.db,
      );

      expect(products).toHaveLength(1);
      expect(products?.[0]?.name).toBe("Beras Premium");
    } finally {
      await test.close();
    }
  });

  it("menjawab kosong bila belum ada warung, bukan melempar galat", async () => {
    const test = await createTestDatabase();

    try {
      await deleteAllBusinesses(test.db);

      const products = await withCurrentBusiness(
        (db, businessId) => listProducts(db, businessId),
        test.db,
      );

      expect(products).toBeUndefined();
    } finally {
      await test.close();
    }
  });
});
