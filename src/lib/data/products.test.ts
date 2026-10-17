import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import {
  createProduct,
  findProduct,
  findProductByName,
  listLowStockProducts,
  listProducts,
  updateProduct,
} from "./products";

let test: TestDatabase;
let otherBusinessId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  otherBusinessId = (await createSecondBusiness(test.db)).id;
}, 60_000);

afterAll(async () => {
  await test.close();
});

const beras = {
  name: "Beras",
  unit: "kilogram",
  salePrice: 15000,
  purchasePrice: 14000,
  minimumStock: 5,
};

describe("data produk", () => {
  it("menambah produk dengan stok awal nol", async () => {
    const product = await createProduct(test.db, test.business.id, beras);

    expect(product.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(product.stock).toBe(0);
    expect(product.salePrice).toBe(15000);
    expect(product.purchasePrice).toBe(14000);
    expect(product.minimumStock).toBe(5);
  });

  it("menolak dua produk dengan nama sama di satu warung", async () => {
    await createProduct(test.db, test.business.id, {
      name: "Gula",
      unit: "kilogram",
      salePrice: 16000,
      purchasePrice: 15000,
      minimumStock: 3,
    });

    await expect(
      createProduct(test.db, test.business.id, { ...beras, name: "Gula" }),
    ).rejects.toThrow();
  });

  it("mengizinkan nama yang sama pada warung berbeda", async () => {
    const product = await createProduct(test.db, otherBusinessId, beras);

    expect(product.businessId).toBe(otherBusinessId);
  });

  it("mendaftar produk menurut nama", async () => {
    await createProduct(test.db, test.business.id, {
      name: "Air Mineral",
      unit: "botol",
      salePrice: 4000,
      purchasePrice: 3000,
      minimumStock: 10,
    });

    const names = (await listProducts(test.db, test.business.id)).map(
      (product) => product.name,
    );

    expect(names).toEqual(["Air Mineral", "Beras", "Gula"]);
  });

  it("mencari produk menurut nama tanpa membedakan huruf besar dan kecil", async () => {
    const found = await findProductByName(test.db, test.business.id, "  bErAs ");

    expect(found?.name).toBe("Beras");
  });

  it("tidak mengembalikan produk warung lain", async () => {
    expect(await findProductByName(test.db, otherBusinessId, "Gula")).toBeUndefined();
    expect(await listProducts(test.db, otherBusinessId)).toHaveLength(1);
  });

  it("mengubah harga tanpa mengubah stok", async () => {
    const found = await findProductByName(test.db, test.business.id, "Beras");
    const updated = await updateProduct(test.db, test.business.id, found?.id ?? "", {
      salePrice: 15500,
      minimumStock: 4,
    });

    expect(updated?.salePrice).toBe(15500);
    expect(updated?.minimumStock).toBe(4);
    expect(updated?.stock).toBe(0);
  });

  it("tidak mengubah produk warung lain", async () => {
    const other = await findProductByName(test.db, otherBusinessId, "Beras");

    expect(
      await updateProduct(test.db, test.business.id, other?.id ?? "", {
        salePrice: 99000,
      }),
    ).toBeUndefined();
  });

  it("mendaftar produk yang menyentuh ambang minimum", async () => {
    const low = await listLowStockProducts(test.db, test.business.id);

    expect(low.map((product) => product.name)).toEqual(["Air Mineral", "Beras", "Gula"]);
  });

  it("mengambil satu produk", async () => {
    const product = await createProduct(test.db, test.business.id, {
      name: "Kopi Sachet",
      unit: "sachet",
      salePrice: 2500,
      purchasePrice: 2000,
      minimumStock: 20,
    });

    expect((await findProduct(test.db, test.business.id, product.id))?.name).toBe(
      "Kopi Sachet",
    );
    expect(await findProduct(test.db, otherBusinessId, product.id)).toBeUndefined();
  });
});
