import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  agentSessions,
  approvals,
  businesses,
  conversations,
  customers,
  knowledgeChunks,
  messages,
  orderItems,
  orders,
  payments,
  products,
  purchaseOrderItems,
  purchaseOrders,
  quotaUsage,
  stockAlerts,
  stockMovements,
  toolInvocations,
  transactions,
} from "./schema";

/** Seluruh tabel yang wajib ada, sesuai `docs/ARCHITECTURE.md` bagian 4. */
const TABLES = {
  agentSessions,
  approvals,
  businesses,
  conversations,
  customers,
  knowledgeChunks,
  messages,
  orderItems,
  orders,
  payments,
  products,
  purchaseOrderItems,
  purchaseOrders,
  quotaUsage,
  stockAlerts,
  stockMovements,
  toolInvocations,
  transactions,
} as const;

/** Tabel akar. Tabel ini tidak memuat `business_id`. */
const ROOT_TABLE = "businesses";

/** Kolom yang menyimpan uang, wajib berupa bilangan bulat rupiah penuh. */
const MONEY_COLUMNS: ReadonlyArray<readonly [keyof typeof TABLES, string]> = [
  ["products", "sale_price"],
  ["products", "purchase_price"],
  ["orders", "total"],
  ["orderItems", "unit_price"],
  ["transactions", "amount"],
  ["payments", "expected_amount"],
  ["payments", "read_amount"],
  ["purchaseOrders", "total"],
  ["purchaseOrderItems", "estimated_price"],
];

type ColumnInfo = { name: string; columnType: string };

/** Nama kolom basis data, bukan nama properti TypeScript. */
const columnsOf = (table: (typeof TABLES)[keyof typeof TABLES]): readonly ColumnInfo[] =>
  Object.values(getTableColumns(table)) as unknown as readonly ColumnInfo[];

const columnNames = (table: (typeof TABLES)[keyof typeof TABLES]): readonly string[] =>
  columnsOf(table).map((column) => column.name);

const findColumn = (
  table: (typeof TABLES)[keyof typeof TABLES],
  name: string,
): ColumnInfo | undefined => columnsOf(table).find((column) => column.name === name);

describe("skema basis data", () => {
  it("memuat seluruh tabel yang direncanakan", () => {
    const names = Object.values(TABLES)
      .map((table) => getTableName(table))
      .sort();

    expect(names).toEqual([
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
    ]);
  });

  it("memberi setiap tabel kolom waktu pembuatan", () => {
    for (const table of Object.values(TABLES)) {
      expect(columnNames(table), getTableName(table)).toContain("created_at");
    }
  });

  it("mengikat setiap tabel selain tabel akar ke satu warung", () => {
    for (const table of Object.values(TABLES)) {
      if (getTableName(table) === ROOT_TABLE) {
        continue;
      }

      expect(columnNames(table), getTableName(table)).toContain("business_id");
    }
  });

  it("memakai uuid sebagai kunci utama setiap tabel", () => {
    for (const table of Object.values(TABLES)) {
      expect(findColumn(table, "id")?.columnType, `${getTableName(table)}.id`).toBe(
        "PgUUID",
      );
    }
  });

  it("menamai setiap tabel dan kolom dengan snake_case", () => {
    const snakeCase = /^[a-z][a-z0-9_]*$/u;

    for (const table of Object.values(TABLES)) {
      expect(getTableName(table), getTableName(table)).toMatch(snakeCase);

      for (const column of columnsOf(table)) {
        expect(column.name, `${getTableName(table)}.${column.name}`).toMatch(snakeCase);
      }
    }
  });

  it("menyimpan seluruh kolom uang sebagai bilangan bulat", () => {
    for (const [table, column] of MONEY_COLUMNS) {
      const tableName = getTableName(TABLES[table]);
      const found = findColumn(TABLES[table], column);

      expect(found, `${tableName}.${column} tidak ditemukan`).toBeDefined();
      expect(found?.columnType, `${tableName}.${column} bukan bilangan bulat`).toBe(
        "PgInteger",
      );
    }
  });

  it("tidak memakai tipe pecahan untuk kolom apa pun", () => {
    const fractional = new Set(["PgNumeric", "PgDoublePrecision", "PgReal"]);

    for (const table of Object.values(TABLES)) {
      for (const column of columnsOf(table)) {
        expect(
          fractional.has(column.columnType),
          `${getTableName(table)}.${column.name} memakai tipe pecahan`,
        ).toBe(false);
      }
    }
  });
});
