import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../db/client";
import {
  createSecondBusiness,
  createTestDatabase,
  type TestDatabase,
} from "../db/testing";
import { listLockedSessions, lockSession, startSession } from "./agent-sessions";
import { createApproval, listApprovals } from "./approvals";
import {
  appendMessage,
  listConversations,
  listMessages,
  recordInboundMessage,
} from "./conversations";
import { listCustomers } from "./customers";
import { addKnowledgeChunk, listKnowledgeChunks } from "./knowledge";
import {
  createOrder,
  findOrder,
  findOrderWithItems,
  listItemsForOrders,
  listOrders,
} from "./orders";
import {
  createPayment,
  findPayment,
  listPaymentsByStatus,
  listPaymentsForOrder,
} from "./payments";
import {
  createProduct,
  findProduct,
  listLowStockProducts,
  listProducts,
} from "./products";
import { createPurchaseOrder, listPurchaseOrders } from "./purchase-orders";
import { increaseQuotaUsage, readQuotaUsage } from "./quota-usage";
import { summarizeDay, summarizePeriod } from "./reports";
import { listStockAlerts, listStockMovements, recordStockMovement } from "./stock";
import { listToolInvocations, recordToolInvocation } from "./tool-invocations";
import { createTransaction, findTransaction, listTransactions } from "./transactions";

/*
 * Uji menyeluruh pemisahan data antar warung.
 *
 * Dua warung diisi dengan bentuk data yang sama persis, lalu setiap pembaca
 * dipanggil untuk keduanya. Jumlah barisnya harus sama, dan tidak boleh ada
 * kunci milik warung lain yang muncul. Cara ini menangkap kebocoran data antar
 * warung pada seluruh lapisan akses data sekaligus, bukan hanya pada modul yang
 * kebetulan diuji satu per satu.
 */

type Warung = {
  readonly businessId: string;
  readonly productId: string;
  readonly lowProductId: string;
  readonly customerId: string;
  readonly conversationId: string;
  readonly orderId: string;
  readonly paymentId: string;
  readonly purchaseOrderId: string;
  readonly approvalId: string;
  readonly sessionId: string;
  readonly toolInvocationId: string;
  readonly knowledgeChunkId: string;
  readonly transactionId: string;
};

/** Sabtu 17 Oktober 2026 pukul 09.00 WIB. */
const day = new Date("2026-10-17T02:00:00.000Z");

let test: TestDatabase;
let first: Warung;
let second: Warung;

/** Menyiapkan satu warung kecil dengan satu baris pada setiap tabel. */
const buildWarung = async (db: Database, businessId: string): Promise<Warung> => {
  const beras = await createProduct(db, businessId, {
    name: "Beras",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 13800,
    minimumStock: 10,
  });
  const gula = await createProduct(db, businessId, {
    name: "Gula",
    unit: "kilogram",
    salePrice: 16000,
    purchasePrice: 14800,
    minimumStock: 10,
  });

  await recordStockMovement(db, businessId, {
    productId: beras.id,
    kind: "masuk",
    quantityChange: 20,
    reason: "Stok awal dari pasar induk",
  });
  /* Stok gula sengaja berada di bawah ambang, supaya alertnya muncul. */
  await recordStockMovement(db, businessId, {
    productId: gula.id,
    kind: "masuk",
    quantityChange: 4,
    reason: "Stok awal dari pasar induk",
  });

  const inbound = await recordInboundMessage(db, businessId, {
    channel: "app",
    phoneNumber: "081200000001",
    customerName: "Bu Sari",
    body: "Ada beras?",
  });
  const customer = inbound.customer;

  await appendMessage(db, businessId, inbound.conversation.id, {
    sender: "agent",
    kind: "text",
    body: "Ada, Bu. Beras Rp15.000 per kilogram.",
  });

  const transaction = await createTransaction(db, businessId, {
    kind: "sale",
    description: "Penjualan beras satu kilogram",
    amount: 15000,
    source: "app",
    customerId: customer.id,
    occurredAt: day,
  });

  const order = await createOrder(db, businessId, {
    conversationId: inbound.conversation.id,
    customerId: customer.id,
    items: [{ productId: beras.id, quantity: 1, unitPrice: 15000 }],
  });

  const payment = await createPayment(db, businessId, {
    orderId: order.order.id,
    expectedAmount: order.order.total,
    proofUrl: "https://contoh.test/bukti-transfer.jpg",
  });

  const draft = await createPurchaseOrder(db, businessId, {
    supplierName: "Pasar Induk",
    items: [{ productId: beras.id, quantity: 10, estimatedPrice: 13800 }],
  });

  const approval = await createApproval(db, businessId, {
    purchaseOrderId: draft.order.id,
    summary: "Tambah stok beras sebanyak 10 kilogram dari Pasar Induk",
  });

  const session = await startSession(db, businessId, inbound.conversation.id);

  await lockSession(db, businessId, session.id, approval.id);

  const invocation = await recordToolInvocation(db, businessId, {
    sessionId: session.id,
    toolName: "check_stock",
    arguments: { productName: "Beras" },
  });

  const chunk = await addKnowledgeChunk(db, businessId, {
    content: "Warung buka setiap hari dari pukul 06.00 sampai 21.00.",
    source: "profil warung",
  });

  await increaseQuotaUsage(db, businessId, day);

  return {
    businessId,
    productId: beras.id,
    lowProductId: gula.id,
    customerId: customer.id,
    conversationId: inbound.conversation.id,
    orderId: order.order.id,
    paymentId: payment.id,
    purchaseOrderId: draft.order.id,
    approvalId: approval.id,
    sessionId: session.id,
    toolInvocationId: invocation.id,
    knowledgeChunkId: chunk.id,
    transactionId: transaction.id,
  };
};

beforeAll(async () => {
  test = await createTestDatabase();
  first = await buildWarung(test.db, test.business.id);
  second = await buildWarung(test.db, (await createSecondBusiness(test.db)).id);
}, 60_000);

afterAll(async () => {
  await test.close();
});

type Row = { readonly id: string };

/** Setiap pembaca daftar pada lapisan akses data. */
const sweep: readonly {
  readonly label: string;
  readonly read: (businessId: string) => Promise<Row[]>;
}[] = [
  { label: "produk", read: (businessId) => listProducts(test.db, businessId) },
  {
    label: "produkMenipis",
    read: (businessId) => listLowStockProducts(test.db, businessId),
  },
  { label: "transaksi", read: (businessId) => listTransactions(test.db, businessId) },
  { label: "pelanggan", read: (businessId) => listCustomers(test.db, businessId) },
  { label: "percakapan", read: (businessId) => listConversations(test.db, businessId) },
  { label: "orderan", read: (businessId) => listOrders(test.db, businessId) },
  {
    label: "pembayaranMenunggu",
    read: (businessId) => listPaymentsByStatus(test.db, businessId, "menunggu"),
  },
  {
    label: "draftPesananPembelian",
    read: (businessId) => listPurchaseOrders(test.db, businessId),
  },
  {
    label: "antreanPersetujuan",
    read: (businessId) => listApprovals(test.db, businessId, "menunggu"),
  },
  {
    label: "sesiTerkunci",
    read: (businessId) => listLockedSessions(test.db, businessId),
  },
  { label: "jejakTool", read: (businessId) => listToolInvocations(test.db, businessId) },
  {
    label: "konteksBisnis",
    read: (businessId) => listKnowledgeChunks(test.db, businessId),
  },
  {
    label: "pergerakanStok",
    read: (businessId) => listStockMovements(test.db, businessId),
  },
  {
    label: "alertStokAktif",
    read: (businessId) => listStockAlerts(test.db, businessId, "aktif"),
  },
];

describe("pemisahan data antar warung", () => {
  it("mengembalikan jumlah yang sama untuk kedua warung tanpa saling mencampur", async () => {
    const counts: Record<string, number> = {};

    for (const { label, read } of sweep) {
      const mine = await read(first.businessId);
      const theirs = await read(second.businessId);
      const foreign = new Set(theirs.map((row) => row.id));

      expect(theirs.length).toBe(mine.length);
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.filter((row) => foreign.has(row.id))).toEqual([]);

      counts[label] = mine.length;
    }

    expect(counts).toEqual({
      produk: 2,
      produkMenipis: 1,
      transaksi: 1,
      pelanggan: 1,
      percakapan: 1,
      orderan: 1,
      pembayaranMenunggu: 1,
      draftPesananPembelian: 1,
      antreanPersetujuan: 1,
      sesiTerkunci: 1,
      jejakTool: 1,
      konteksBisnis: 1,
      pergerakanStok: 2,
      alertStokAktif: 1,
    });
  });

  it("tidak membuka baris warung lain menurut kuncinya", async () => {
    const foreign: readonly Promise<Row | undefined>[] = [
      findProduct(test.db, first.businessId, second.productId),
      findProduct(test.db, first.businessId, second.lowProductId),
      findTransaction(test.db, first.businessId, second.transactionId),
      findOrder(test.db, first.businessId, second.orderId),
      findPayment(test.db, first.businessId, second.paymentId),
    ];

    for (const read of foreign) {
      expect(await read).toBeUndefined();
    }

    expect(await findProduct(test.db, first.businessId, first.productId)).toBeDefined();
    expect(
      await findTransaction(test.db, first.businessId, first.transactionId),
    ).toBeDefined();
    expect(await findOrder(test.db, first.businessId, first.orderId)).toBeDefined();
    expect(await findPayment(test.db, first.businessId, first.paymentId)).toBeDefined();
  });

  it("tidak mengembalikan rincian maupun pesan milik warung lain", async () => {
    expect(await listMessages(test.db, first.businessId, second.conversationId)).toEqual(
      [],
    );
    expect(await listItemsForOrders(test.db, first.businessId, [second.orderId])).toEqual(
      [],
    );
    expect(await listPaymentsForOrder(test.db, first.businessId, second.orderId)).toEqual(
      [],
    );
    expect(
      await findOrderWithItems(test.db, first.businessId, second.orderId),
    ).toBeUndefined();

    expect(
      await listMessages(test.db, first.businessId, first.conversationId),
    ).toHaveLength(2);
    expect(
      await listItemsForOrders(test.db, first.businessId, [first.orderId]),
    ).toHaveLength(1);
    expect(
      await listPaymentsForOrder(test.db, first.businessId, first.orderId),
    ).toHaveLength(1);
    expect(
      (await findOrderWithItems(test.db, first.businessId, first.orderId))?.items,
    ).toHaveLength(1);
  });

  it("menghitung laporan dan pemakaian harian per warung", async () => {
    const mine = await summarizeDay(test.db, first.businessId, day);
    const theirs = await summarizeDay(test.db, second.businessId, day);

    expect(mine).toEqual(theirs);
    expect(mine.sales).toBe(15000);
    expect(mine.transactionCount).toBe(1);

    const period = await summarizePeriod(test.db, first.businessId, {
      from: new Date("2026-10-16T17:00:00.000Z"),
      to: new Date("2026-10-17T17:00:00.000Z"),
    });

    expect(period).toEqual(mine);
    expect(await readQuotaUsage(test.db, first.businessId, day)).toBe(1);
    expect(await readQuotaUsage(test.db, second.businessId, day)).toBe(1);
  });
});
