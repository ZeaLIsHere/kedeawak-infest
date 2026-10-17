import { createApproval, listApprovals } from "../data/approvals";
import { createBusiness, deleteAllBusinesses } from "../data/business";
import {
  appendMessage,
  listConversations,
  recordInboundMessage,
} from "../data/conversations";
import { findOrCreateCustomer, listCustomers } from "../data/customers";
import { listKnowledgeChunks, replaceKnowledgeSource } from "../data/knowledge";
import { createOrder, listOrders, updateOrderStatus } from "../data/orders";
import { startOfDay } from "../data/period";
import { createProduct, findProduct, listProducts } from "../data/products";
import { createPurchaseOrder } from "../data/purchase-orders";
import { listStockAlerts, listStockMovements, recordStockMovement } from "../data/stock";
import { createTransaction, listTransactions } from "../data/transactions";
import type { Database } from "./client";

/*
 * Data awal untuk demo.
 *
 * Seluruh penulisan lewat `src/lib/data/`, sesuai aturan struktur pada
 * `docs/ARCHITECTURE.md` bagian 3 aturan 2, sehingga data demo mengalir lewat
 * alur aplikasi yang sebenarnya. Data lama dihapus lebih dulu, supaya keadaan
 * awal selalu sama setiap kali dijalankan.
 *
 * Angka acaknya sengaja tetap, jadi jumlah transaksi dan total penjualannya
 * sama pada setiap penyiapan. Tanggalnya mengikuti waktu berjalan, supaya
 * laporan hari ini dan minggu ini selalu berisi.
 */

/** Nama warung demo. */
export const DEMO_BUSINESS_NAME = "Warung Sembako Bu Rina";

const DAY_COUNT = 21;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Jumlah produk terlaris yang ikut mengisi riwayat penjualan harian. */
const FAST_MOVING_COUNT = 6;

/** Asal potongan konteks bisnis warung demo. */
const DEMO_KNOWLEDGE_SOURCE = "profil warung";

type DemoProduct = {
  readonly name: string;
  readonly unit: string;
  readonly salePrice: number;
  readonly purchasePrice: number;
  readonly minimumStock: number;
  readonly openingStock: number;
};

/** Sekitar dua puluh barang dagangan warung sembako. */
const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    name: "Beras Pandan Wangi",
    unit: "kilogram",
    salePrice: 15000,
    purchasePrice: 13800,
    minimumStock: 20,
    openingStock: 80,
  },
  {
    name: "Gula Pasir",
    unit: "kilogram",
    salePrice: 16000,
    purchasePrice: 14800,
    minimumStock: 15,
    openingStock: 50,
  },
  {
    name: "Minyak Goreng Kemasan",
    unit: "liter",
    salePrice: 18000,
    purchasePrice: 16500,
    minimumStock: 12,
    openingStock: 40,
  },
  {
    name: "Telur Ayam",
    unit: "kilogram",
    salePrice: 28000,
    purchasePrice: 26000,
    minimumStock: 10,
    openingStock: 45,
  },
  {
    name: "Mie Instan Goreng",
    unit: "bungkus",
    salePrice: 3500,
    purchasePrice: 2900,
    minimumStock: 40,
    openingStock: 150,
  },
  {
    name: "Kopi Sachet",
    unit: "sachet",
    salePrice: 2500,
    purchasePrice: 1900,
    minimumStock: 50,
    openingStock: 180,
  },
  {
    name: "Teh Celup",
    unit: "kotak",
    salePrice: 6000,
    purchasePrice: 5200,
    minimumStock: 10,
    openingStock: 30,
  },
  {
    name: "Sabun Mandi",
    unit: "buah",
    salePrice: 4500,
    purchasePrice: 3800,
    minimumStock: 20,
    openingStock: 60,
  },
  {
    name: "Sabun Cuci",
    unit: "buah",
    salePrice: 5500,
    purchasePrice: 4600,
    minimumStock: 15,
    openingStock: 45,
  },
  {
    name: "Shampo Sachet",
    unit: "sachet",
    salePrice: 1000,
    purchasePrice: 700,
    minimumStock: 60,
    openingStock: 200,
  },
  {
    name: "Air Mineral Botol",
    unit: "botol",
    salePrice: 4000,
    purchasePrice: 3000,
    minimumStock: 24,
    openingStock: 96,
  },
  {
    name: "Susu Kental Manis",
    unit: "kaleng",
    salePrice: 12000,
    purchasePrice: 10500,
    minimumStock: 12,
    openingStock: 36,
  },
  {
    name: "Tepung Terigu",
    unit: "kilogram",
    salePrice: 12000,
    purchasePrice: 11000,
    minimumStock: 10,
    openingStock: 28,
  },
  {
    name: "Garam Halus",
    unit: "bungkus",
    salePrice: 3000,
    purchasePrice: 2400,
    minimumStock: 10,
    openingStock: 30,
  },
  {
    name: "Kecap Manis",
    unit: "botol",
    salePrice: 15000,
    purchasePrice: 13000,
    minimumStock: 6,
    openingStock: 18,
  },
  {
    name: "Sarden Kaleng",
    unit: "kaleng",
    salePrice: 17000,
    purchasePrice: 15000,
    minimumStock: 6,
    openingStock: 26,
  },
  {
    name: "Biskuit Kaleng",
    unit: "kaleng",
    salePrice: 25000,
    purchasePrice: 22000,
    minimumStock: 4,
    openingStock: 16,
  },
  {
    name: "Permen Mint",
    unit: "bungkus",
    salePrice: 2000,
    purchasePrice: 1500,
    minimumStock: 30,
    openingStock: 90,
  },
  {
    name: "Gas LPG 3 Kilogram",
    unit: "tabung",
    salePrice: 22000,
    purchasePrice: 19500,
    minimumStock: 5,
    openingStock: 14,
  },
  {
    name: "Tisu Wajah",
    unit: "kotak",
    salePrice: 9000,
    purchasePrice: 7500,
    minimumStock: 8,
    openingStock: 24,
  },
];

type DemoCustomer = {
  readonly name: string;
  readonly phoneNumber: string;
};

/** Pelanggan tetap warung beserta nomornya. */
const DEMO_CUSTOMERS: readonly DemoCustomer[] = [
  { name: "Bu Sari", phoneNumber: "081234567811" },
  { name: "Pak Budi", phoneNumber: "081234567812" },
  { name: "Bu Nia", phoneNumber: "081234567813" },
  { name: "Pak Anto", phoneNumber: "081234567814" },
  { name: "Bu Wati", phoneNumber: "081234567815" },
  { name: "Mas Dedi", phoneNumber: "081234567816" },
];

type DemoTurn = {
  readonly from: "customer" | "agent" | "owner";
  readonly body: string;
};

type DemoConversation = {
  readonly phoneNumber: string;
  readonly turns: readonly DemoTurn[];
};

/** Percakapan pelanggan yang masuk lewat WhatsApp, beserta balasannya. */
const DEMO_CONVERSATIONS: readonly DemoConversation[] = [
  {
    phoneNumber: "081234567811",
    turns: [
      { from: "customer", body: "Selamat pagi, ada beras?" },
      { from: "agent", body: "Ada, Bu. Beras Pandan Wangi Rp15.000 per kilogram." },
      { from: "customer", body: "Ambil lima kilogram ya" },
      { from: "owner", body: "Sudah disiapkan, Bu. Total Rp75.000." },
    ],
  },
  {
    phoneNumber: "081234567812",
    turns: [
      { from: "customer", body: "Minyak goreng masih ada?" },
      { from: "agent", body: "Masih ada, Pak. Rp18.000 per liter." },
      { from: "customer", body: "Dua liter saja" },
      { from: "agent", body: "Baik, Pak. Total Rp36.000." },
    ],
  },
  {
    phoneNumber: "081234567813",
    turns: [
      {
        from: "customer",
        body: "Kirim gula pasir dua kilogram dan telur satu kilogram",
      },
      { from: "agent", body: "Baik, Bu. Totalnya Rp60.000." },
      { from: "owner", body: "Pesanan sudah dicatat dan siap diantar sore ini." },
    ],
  },
  {
    phoneNumber: "081234567815",
    turns: [
      { from: "customer", body: "Warung buka sampai jam berapa?" },
      { from: "agent", body: "Warung buka setiap hari dari pukul 06.00 sampai 21.00." },
    ],
  },
  {
    phoneNumber: "081234567816",
    turns: [
      { from: "customer", body: "Ada gas LPG 3 kilogram?" },
      { from: "agent", body: "Ada, Mas. Rp22.000 per tabung." },
      { from: "customer", body: "Nanti saya ambil satu tabung" },
    ],
  },
];

/** Potongan konteks bisnis yang dipakai agen saat menjawab. */
const DEMO_KNOWLEDGE: readonly string[] = [
  "Nama warung: Warung Sembako Bu Rina, menjual sembako dan kebutuhan harian.",
  "Buka setiap hari dari pukul 06.00 sampai 21.00.",
  "Alamat: Jalan Melati nomor 12, tidak jauh dari pasar induk.",
  "Melayani pesanan lewat WhatsApp dan mengantar ke kampung sekitar.",
  "Hutang pelanggan dicatat dan dilunasi paling lama satu minggu.",
  "Pembayaran tunai atau transfer ke rekening warung.",
];

/** Hasil penyiapan data demo. */
export type SeedResult = {
  readonly businessId: string;
  readonly products: number;
  readonly customers: number;
  readonly conversations: number;
  readonly orders: number;
  readonly transactions: number;
  readonly stockMovements: number;
  readonly activeAlerts: number;
  readonly pendingApprovals: number;
  readonly knowledgeChunks: number;
};

/** Pembangkit angka tetap, supaya data demo sama setiap kali disiapkan. */
function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;

    return state / 2147483648;
  };
}

/** Bilangan bulat pada rentang tertutup. */
function between(random: () => number, minimum: number, maximum: number): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

/** Menghapus data lama, lalu menyiapkan satu warung beserta isinya. */
export async function seedDemoData(
  db: Database,
  options: { readonly now?: Date } = {},
): Promise<SeedResult> {
  const now = options.now ?? new Date();
  const random = createRandom(20261017);

  /*
   * Waktu pada satu hari menurut Waktu Indonesia Barat. Catatan hari ini yang
   * jamnya belum tiba ditarik ke waktu berjalan, supaya tidak ada catatan yang
   * bertanggal di masa depan ketika demo dijalankan pada pagi hari.
   */
  const atHour = (day: Date, hour: number): Date => {
    const at = new Date(day.getTime() + hour * HOUR_MS);

    return at.getTime() > now.getTime() ? new Date(now) : at;
  };

  await deleteAllBusinesses(db);

  const business = await createBusiness(db, {
    name: DEMO_BUSINESS_NAME,
    opensAt: "06:00",
    closesAt: "21:00",
  });
  const businessId = business.id;

  const today = startOfDay(now);
  const firstDay = new Date(today.getTime() - DAY_COUNT * DAY_MS);
  const productIds = new Map<string, string>();

  for (const item of DEMO_PRODUCTS) {
    const product = await createProduct(db, businessId, {
      name: item.name,
      unit: item.unit,
      salePrice: item.salePrice,
      purchasePrice: item.purchasePrice,
      minimumStock: item.minimumStock,
    });

    productIds.set(item.name, product.id);

    await recordStockMovement(db, businessId, {
      productId: product.id,
      kind: "masuk",
      quantityChange: item.openingStock,
      reason: "Stok awal dari pasar induk",
      createdAt: atHour(firstDay, 7),
    });
  }

  const customerIds = new Map<string, string>();

  for (const customer of DEMO_CUSTOMERS) {
    const stored = await findOrCreateCustomer(db, businessId, customer);

    customerIds.set(customer.phoneNumber, stored.id);
  }

  const conversationIds = new Map<string, string>();

  for (const demo of DEMO_CONVERSATIONS) {
    const name = DEMO_CUSTOMERS.find(
      (item) => item.phoneNumber === demo.phoneNumber,
    )?.name;

    for (const [index, turn] of demo.turns.entries()) {
      if (turn.from === "customer") {
        const inbound = await recordInboundMessage(db, businessId, {
          channel: "whatsapp",
          phoneNumber: demo.phoneNumber,
          customerName: index === 0 ? name : null,
          body: turn.body,
        });

        conversationIds.set(demo.phoneNumber, inbound.conversation.id);

        continue;
      }

      const conversationId = conversationIds.get(demo.phoneNumber);

      if (conversationId === undefined) {
        continue;
      }

      await appendMessage(db, businessId, conversationId, {
        sender: turn.from,
        kind: "text",
        body: turn.body,
      });
    }
  }

  await replaceKnowledgeSource(db, businessId, DEMO_KNOWLEDGE_SOURCE, DEMO_KNOWLEDGE);

  const firstOrder = await createOrder(db, businessId, {
    conversationId: conversationIds.get("081234567811") ?? null,
    customerId: customerIds.get("081234567811") ?? null,
    createdAt: atHour(new Date(today.getTime() - 2 * DAY_MS), 9),
    items: [
      {
        productId: productIds.get("Beras Pandan Wangi") ?? "",
        quantity: 5,
        unitPrice: 15000,
      },
      { productId: productIds.get("Gula Pasir") ?? "", quantity: 2, unitPrice: 16000 },
    ],
  });
  const secondOrder = await createOrder(db, businessId, {
    conversationId: conversationIds.get("081234567812") ?? null,
    customerId: customerIds.get("081234567812") ?? null,
    createdAt: atHour(new Date(today.getTime() - DAY_MS), 10),
    items: [
      {
        productId: productIds.get("Minyak Goreng Kemasan") ?? "",
        quantity: 2,
        unitPrice: 18000,
      },
    ],
  });
  const thirdOrder = await createOrder(db, businessId, {
    conversationId: conversationIds.get("081234567813") ?? null,
    customerId: customerIds.get("081234567813") ?? null,
    createdAt: atHour(new Date(today.getTime() - DAY_MS), 11),
    items: [
      { productId: productIds.get("Gula Pasir") ?? "", quantity: 2, unitPrice: 16000 },
      { productId: productIds.get("Telur Ayam") ?? "", quantity: 1, unitPrice: 28000 },
    ],
  });

  await createOrder(db, businessId, {
    conversationId: conversationIds.get("081234567816") ?? null,
    customerId: customerIds.get("081234567816") ?? null,
    createdAt: atHour(today, 8),
    items: [
      {
        productId: productIds.get("Gas LPG 3 Kilogram") ?? "",
        quantity: 1,
        unitPrice: 22000,
      },
    ],
  });

  await updateOrderStatus(db, businessId, firstOrder.order.id, "selesai");
  await updateOrderStatus(db, businessId, secondOrder.order.id, "dikonfirmasi");
  await updateOrderStatus(db, businessId, thirdOrder.order.id, "dikonfirmasi");

  const fastMoving = DEMO_PRODUCTS.slice(0, FAST_MOVING_COUNT);

  for (let index = DAY_COUNT - 1; index >= 0; index -= 1) {
    const day = new Date(today.getTime() - index * DAY_MS);

    for (const offset of [0, 1]) {
      const item = fastMoving[(index * 2 + offset) % fastMoving.length];
      const productId = item === undefined ? undefined : productIds.get(item.name);

      if (item === undefined || productId === undefined) {
        continue;
      }

      const quantity = between(random, 1, 4);
      const at = atHour(day, 9 + offset * 4);

      await createTransaction(db, businessId, {
        kind: "sale",
        description: `Penjualan ${item.name}`,
        amount: quantity * item.salePrice,
        source: "whatsapp",
        occurredAt: at,
      });

      await recordStockMovement(db, businessId, {
        productId,
        kind: "keluar",
        quantityChange: -quantity,
        reason: `Penjualan ${item.name}`,
        createdAt: at,
      });
    }

    if (index % 3 === 0) {
      await createTransaction(db, businessId, {
        kind: "expense",
        description: "Belanja stok ke pasar induk",
        amount: between(random, 120000, 450000),
        source: "app",
        occurredAt: atHour(day, 7),
      });
    }

    if (index % 4 === 0) {
      const debtor = DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length];
      const customerId =
        debtor === undefined ? undefined : customerIds.get(debtor.phoneNumber);

      if (debtor !== undefined && customerId !== undefined) {
        await createTransaction(db, businessId, {
          kind: "debt",
          description: `Hutang ${debtor.name}`,
          amount: between(random, 20000, 90000),
          source: "whatsapp",
          customerId,
          occurredAt: atHour(day, 14),
        });
      }
    }
  }

  await createTransaction(db, businessId, {
    kind: "expense",
    description: "Beli kantong plastik dan kemasan",
    amount: 45000,
    source: "struk",
    occurredAt: atHour(today, 13),
  });

  /*
   * Dua barang terakhir laku pada hari ini, sehingga stoknya berakhir di bawah
   * ambang minimum dan alertnya muncul. Dari alert itu pemilik dapat membuat
   * draft pesanan pembelian, sesuai alur pada `docs/SCOPE.md` bagian 7.
   */
  for (const name of ["Sarden Kaleng", "Biskuit Kaleng"]) {
    const item = DEMO_PRODUCTS.find((candidate) => candidate.name === name);
    const productId = productIds.get(name);

    if (item === undefined || productId === undefined) {
      continue;
    }

    const product = await findProduct(db, businessId, productId);
    const sold = (product?.stock ?? 0) - (item.minimumStock - 2);

    if (sold <= 0) {
      continue;
    }

    const at = atHour(today, 16);

    await recordStockMovement(db, businessId, {
      productId,
      kind: "keluar",
      quantityChange: -sold,
      reason: `Penjualan ${item.name}`,
      createdAt: at,
    });

    await createTransaction(db, businessId, {
      kind: "sale",
      description: `Penjualan ${item.name}`,
      amount: sold * item.salePrice,
      source: "app",
      occurredAt: at,
    });
  }

  const restock = DEMO_PRODUCTS.find((item) => item.name === "Sarden Kaleng");
  const restockId = productIds.get("Sarden Kaleng");

  if (restock !== undefined && restockId !== undefined) {
    const draft = await createPurchaseOrder(db, businessId, {
      supplierName: "Pasar Induk",
      items: [
        { productId: restockId, quantity: 24, estimatedPrice: restock.purchasePrice },
      ],
    });

    await createApproval(db, businessId, {
      purchaseOrderId: draft.order.id,
      summary: `Tambah stok ${restock.name} sebanyak 24 ${restock.unit} dari Pasar Induk`,
    });
  }

  return {
    businessId,
    products: (await listProducts(db, businessId)).length,
    customers: (await listCustomers(db, businessId)).length,
    conversations: (await listConversations(db, businessId)).length,
    orders: (await listOrders(db, businessId)).length,
    transactions: (await listTransactions(db, businessId)).length,
    stockMovements: (await listStockMovements(db, businessId)).length,
    activeAlerts: (await listStockAlerts(db, businessId, "aktif")).length,
    pendingApprovals: (await listApprovals(db, businessId, "menunggu")).length,
    knowledgeChunks: (await listKnowledgeChunks(db, businessId)).length,
  };
}
