import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Definisi skema KedeAwak, mengikuti `docs/ARCHITECTURE.md` bagian 4.
 *
 * Aturan yang dipatuhi di berkas ini:
 *
 * 1. Nama tabel dan kolom memakai bahasa Inggris dan snake_case, sesuai
 *    `docs/CONVENTIONS.md` bagian 7. Nilai enum memakai bahasa Indonesia,
 *    karena `docs/ARCHITECTURE.md` bagian 4 menyebut nilainya secara langsung.
 * 2. Uang disimpan sebagai bilangan bulat rupiah penuh. Tidak ada bilangan
 *    desimal untuk uang.
 * 3. Semua tabel punya `created_at`. Tabel yang dapat diubah punya `updated_at`.
 * 4. Setiap tabel memuat `business_id` langsung, bukan hanya lewat tabel induk.
 *    Alasannya, aturan keamanan bagian 8 butir 4 mewajibkan setiap query
 *    menyertakan `business_id`, dan kolom langsung membuat aturan itu dapat
 *    dipenuhi tanpa join.
 * 5. Kunci utama memakai uuid, bukan angka berurut. Alasannya, seluruh data
 *    terikat pada satu warung, dan angka berurut membuat jumlah data antar
 *    warung bocor lewat alamat halaman.
 *
 * Relasi antar tabel belum ditulis di sini. Relasi ditambahkan saat lapisan
 * akses data pada T2.5 membutuhkannya, supaya berkas ini hanya memuat yang
 * dipakai.
 */

/** Kanal sebuah percakapan. */
export const conversationChannelEnum = pgEnum("conversation_channel", [
  "whatsapp",
  "app",
]);

/** Keadaan sebuah percakapan. */
export const conversationStatusEnum = pgEnum("conversation_status", [
  "terbuka",
  "selesai",
]);

/** Siapa yang mengirim sebuah pesan. */
export const messageSenderEnum = pgEnum("message_sender", ["customer", "owner", "agent"]);

/** Jenis isi sebuah pesan. */
export const messageKindEnum = pgEnum("message_kind", ["text", "voice", "image"]);

/** Keadaan orderan pelanggan. */
export const orderStatusEnum = pgEnum("order_status", [
  "baru",
  "dikonfirmasi",
  "selesai",
]);

/** Hasil pencocokan bukti pembayaran. */
export const paymentStatusEnum = pgEnum("payment_status", [
  "menunggu",
  "cocok",
  "tidak_cocok",
]);

/** Jenis transaksi keuangan. */
export const transactionKindEnum = pgEnum("transaction_kind", [
  "sale",
  "expense",
  "debt",
]);

/** Asal sebuah transaksi keuangan. */
export const transactionSourceEnum = pgEnum("transaction_source", [
  "whatsapp",
  "app",
  "struk",
]);

/** Jenis pergerakan stok. */
export const stockMovementKindEnum = pgEnum("stock_movement_kind", [
  "masuk",
  "keluar",
  "penyesuaian",
]);

/** Keadaan sebuah alert stok menipis. */
export const stockAlertStatusEnum = pgEnum("stock_alert_status", ["aktif", "selesai"]);

/** Keadaan sebuah draft pesanan pembelian. */
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "disetujui",
  "ditolak",
]);

/** Jenis aksi yang menunggu persetujuan pemilik. */
export const approvalKindEnum = pgEnum("approval_kind", ["purchase_order"]);

/** Keadaan sebuah aksi pada antrean persetujuan. */
export const approvalStatusEnum = pgEnum("approval_status", [
  "menunggu",
  "disetujui",
  "ditolak",
]);

/** Keadaan koneksi nomor WhatsApp warung. */
export const channelStatusEnum = pgEnum("channel_status", [
  "belum_diatur",
  "terhubung",
  "terputus",
]);

/** Keadaan kunci konteks sebuah sesi agen. */
export const sessionLockStatusEnum = pgEnum("session_lock_status", [
  "bebas",
  "menunggu_persetujuan",
]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/** Warung. Akar seluruh data, sesuai aturan privasi pemisahan data antar warung. */
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  opensAt: time("opens_at"),
  closesAt: time("closes_at"),
  channelStatus: channelStatusEnum("channel_status").notNull().default("belum_diatur"),
  channelPhoneNumber: text("channel_phone_number"),
  channelConnectedAt: timestamp("channel_connected_at", { withTimezone: true }),
  channelPackage: text("channel_package"),
  channelQuota: integer("channel_quota"),
  channelCheckedAt: timestamp("channel_checked_at", { withTimezone: true }),
  createdAt,
  updatedAt,
});

/** Produk warung beserta harga dan stoknya. */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    salePrice: integer("sale_price").notNull(),
    purchasePrice: integer("purchase_price").notNull(),
    stock: integer("stock").notNull().default(0),
    minimumStock: integer("minimum_stock").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("products_business_name_key").on(table.businessId, table.name),
    index("products_business_stock_idx").on(table.businessId, table.stock),
  ],
);

/**
 * Pelanggan warung.
 *
 * Nama dan nomor telepon disimpan terenkripsi di lapisan aplikasi, sesuai
 * bagian 8 butir 1. Karena teks terenkripsi tidak dapat dicari, nomor telepon
 * juga disimpan sebagai sidik jari (`phone_number_hash`) yang boleh dicari.
 * Sidik jari itu yang dipakai untuk menemukan pelanggan saat pesan masuk.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    nameEncrypted: text("name_encrypted"),
    phoneNumberEncrypted: text("phone_number_encrypted").notNull(),
    phoneNumberHash: text("phone_number_hash").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("customers_business_phone_key").on(
      table.businessId,
      table.phoneNumberHash,
    ),
  ],
);

/**
 * Percakapan dengan pelanggan.
 *
 * `customer_phone_hash` dipakai untuk mencocokkan pesan masuk dari nomor yang
 * belum tercatat sebagai pelanggan. Nomor pelanggan sendiri hanya disimpan pada
 * tabel `customers` dalam bentuk terenkripsi.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    channel: conversationChannelEnum("channel").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerPhoneHash: text("customer_phone_hash").notNull(),
    status: conversationStatusEnum("status").notNull().default("terbuka"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("conversations_business_phone_idx").on(
      table.businessId,
      table.customerPhoneHash,
    ),
    index("conversations_business_status_idx").on(table.businessId, table.status),
  ],
);

/** Pesan di dalam sebuah percakapan. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: messageSenderEnum("sender").notNull(),
    kind: messageKindEnum("kind").notNull().default("text"),
    body: text("body"),
    mediaUrl: text("media_url"),
    createdAt,
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  ],
);

/** Orderan pelanggan yang berasal dari percakapan. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    total: integer("total").notNull().default(0),
    status: orderStatusEnum("status").notNull().default("baru"),
    createdAt,
    updatedAt,
  },
  (table) => [index("orders_business_created_idx").on(table.businessId, table.createdAt)],
);

/** Rincian item sebuah orderan. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    createdAt,
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/**
 * Transaksi keuangan warung.
 *
 * `confidence` memuat angka 0 sampai 100 yang menyatakan keyakinan hasil
 * pembacaan struk. Nilainya kosong untuk transaksi yang diketik langsung.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    kind: transactionKindEnum("kind").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    source: transactionSourceEnum("source").notNull(),
    proofUrl: text("proof_url"),
    confidence: integer("confidence"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("transactions_business_occurred_idx").on(table.businessId, table.occurredAt),
    index("transactions_business_kind_idx").on(table.businessId, table.kind),
  ],
);

/** Bukti pembayaran sebuah orderan beserta hasil pencocokannya. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    proofUrl: text("proof_url"),
    expectedAmount: integer("expected_amount").notNull(),
    readAmount: integer("read_amount"),
    status: paymentStatusEnum("status").notNull().default("menunggu"),
    createdAt,
    updatedAt,
  },
  (table) => [index("payments_order_idx").on(table.orderId)],
);

/** Jejak setiap perubahan stok. Tidak ada perubahan stok tanpa baris di sini. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: stockMovementKindEnum("kind").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    reason: text("reason").notNull(),
    createdAt,
  },
  (table) => [
    index("stock_movements_product_created_idx").on(table.productId, table.createdAt),
  ],
);

/** Alert saat stok sebuah produk berada di bawah ambang minimum. */
export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    stockAtAlert: integer("stock_at_alert").notNull(),
    minimumStock: integer("minimum_stock").notNull(),
    status: stockAlertStatusEnum("status").notNull().default("aktif"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("stock_alerts_business_status_idx").on(table.businessId, table.status),
  ],
);

/** Draft pesanan pembelian ke pemasok. Baru berlaku setelah disetujui. */
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    supplierName: text("supplier_name").notNull(),
    total: integer("total").notNull().default(0),
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("purchase_orders_business_status_idx").on(table.businessId, table.status),
  ],
);

/** Rincian item sebuah draft pesanan pembelian. */
export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    estimatedPrice: integer("estimated_price").notNull(),
    createdAt,
  },
  (table) => [index("purchase_order_items_order_idx").on(table.purchaseOrderId)],
);

/**
 * Antrean aksi yang menunggu keputusan pemilik.
 *
 * `payload` memuat muatan aksi apa adanya supaya aksi dapat dijalankan setelah
 * disetujui, dan `summary` memuat ringkasan berbahasa Indonesia yang dibaca
 * pemilik di permukaan S6.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    kind: approvalKindEnum("kind").notNull(),
    payload: jsonb("payload").notNull(),
    summary: text("summary").notNull(),
    status: approvalStatusEnum("status").notNull().default("menunggu"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [index("approvals_business_status_idx").on(table.businessId, table.status)],
);

/**
 * Sesi percakapan dengan agen AI.
 *
 * Tabel ini menggantikan Redis untuk menyimpan kunci konteks. Selama kunci
 * masih menunggu persetujuan, pesan berikutnya tidak dianggap transaksi baru.
 */
export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    lockStatus: sessionLockStatusEnum("lock_status").notNull().default("bebas"),
    pendingApprovalId: uuid("pending_approval_id").references(() => approvals.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("agent_sessions_business_lock_idx").on(table.businessId, table.lockStatus),
  ],
);

/** Jejak audit setiap pemanggilan tool. */
export const toolInvocations = pgTable(
  "tool_invocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name").notNull(),
    arguments: jsonb("arguments").notNull(),
    result: jsonb("result"),
    failed: boolean("failed").notNull().default(false),
    createdAt,
  },
  (table) => [
    index("tool_invocations_business_created_idx").on(table.businessId, table.createdAt),
  ],
);

/**
 * Potongan konteks bisnis yang dipakai agen untuk menjawab.
 *
 * Kolom vektor embedding belum ditulis di sini, karena pemilihan sumber
 * embedding menunggu keputusan T4.6. Bila keputusannya memakai vektor, kolom
 * vektor ditambahkan lewat migrasi baru.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    source: text("source").notNull(),
    createdAt,
  },
  (table) => [index("knowledge_chunks_business_idx").on(table.businessId)],
);

/** Pemakaian harian yang dibatasi kuota, misalnya jumlah permintaan ke model. */
export const quotaUsage = pgTable(
  "quota_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    usageDate: timestamp("usage_date", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("quota_usage_business_date_key").on(table.businessId, table.usageDate),
  ],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type StockAlert = typeof stockAlerts.$inferSelect;
export type NewStockAlert = typeof stockAlerts.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;

export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;

export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type NewToolInvocation = typeof toolInvocations.$inferInsert;

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;

export type QuotaUsage = typeof quotaUsage.$inferSelect;
export type NewQuotaUsage = typeof quotaUsage.$inferInsert;
