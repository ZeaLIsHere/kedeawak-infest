import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "./client";
import { runMigrations } from "./migrate";
import { businesses, products } from "./schema";

/** Seluruh tabel yang wajib dibuat oleh migrasi pertama. */
const PLANNED_TABLES = [
  "agent_sessions",
  "approvals",
  "businesses",
  "conversations",
  "customers",
  "knowledge_chunks",
  "messages",
  "order_items",
  "orders",
  "payments",
  "products",
  "purchase_order_items",
  "purchase_orders",
  "quota_usage",
  "stock_alerts",
  "stock_movements",
  "tool_invocations",
  "transactions",
];

let handle: DatabaseHandle | undefined;

beforeAll(async () => {
  handle = createDatabase({ PGLITE_DATA_DIR: "memory://" });

  await runMigrations(handle);
}, 60_000);

afterAll(async () => {
  await handle?.close();
  handle = undefined;
});

function opened(): DatabaseHandle {
  if (handle === undefined) {
    throw new Error("Pegangan basis data belum dibuka");
  }

  return handle;
}

function openedClient(): PGlite {
  const current = opened().client;

  if (!(current instanceof PGlite)) {
    throw new Error("Driver yang terbuka bukan PGlite");
  }

  return current;
}

async function tablesInSchema(schema: string): Promise<string[]> {
  const result = await openedClient().query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = $1 and table_type = 'BASE TABLE'
     order by table_name`,
    [schema],
  );

  return result.rows.map((row) => row.table_name);
}

describe("migrasi basis data", () => {
  it("membuat seluruh tabel yang direncanakan", async () => {
    expect(await tablesInSchema("public")).toEqual(PLANNED_TABLES);
  });

  it("mencatat riwayat migrasi di skema sendiri", async () => {
    expect(await tablesInSchema("drizzle")).toEqual(["__drizzle_migrations"]);
  });

  it("dapat dijalankan ulang tanpa galat", async () => {
    await runMigrations(opened());

    expect(await tablesInSchema("public")).toEqual(PLANNED_TABLES);
  });

  it("menerima baris nyata dengan kunci bawaan dan nilai enum", async () => {
    const [business] = await opened()
      .db.insert(businesses)
      .values({ name: "Warung Uji" })
      .returning();

    expect(business.name).toBe("Warung Uji");
    expect(business.channelStatus).toBe("belum_diatur");
    expect(business.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
    );

    const [product] = await opened()
      .db.insert(products)
      .values({
        businessId: business.id,
        name: "Beras",
        unit: "kilogram",
        salePrice: 15000,
        purchasePrice: 14000,
        stock: 12,
        minimumStock: 3,
      })
      .returning();

    expect(product.salePrice).toBe(15000);
    expect(product.stock).toBe(12);
    expect(product.businessId).toBe(business.id);
  });

  it("menolak baris yang menunjuk warung yang tidak ada", async () => {
    const missing = "00000000-0000-0000-0000-000000000000";

    await expect(
      opened().db.insert(products).values({
        businessId: missing,
        name: "Gula",
        unit: "kilogram",
        salePrice: 16000,
        purchasePrice: 15000,
      }),
    ).rejects.toThrow();
  });
});
