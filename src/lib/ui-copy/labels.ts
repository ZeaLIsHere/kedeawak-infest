import type {
  Approval,
  Order,
  Payment,
  StockAlert,
  StockMovement,
  Transaction,
} from "../db/schema";

/*
 * Nilai enum di basis data sebagian memakai bahasa Inggris dan sebagian bahasa
 * Indonesia. Antarmuka hanya boleh memakai bahasa Indonesia, sehingga setiap
 * nilai dipetakan di satu tempat, yaitu berkas ini.
 *
 * Setiap pemetaan bertipe `Record` atas nilai enumnya. Akibatnya, nilai enum
 * baru yang belum punya label langsung menjadi galat tipe, bukan teks kosong
 * yang lolos ke layar.
 */

const TRANSACTION_KIND: Record<Transaction["kind"], string> = {
  sale: "Penjualan",
  expense: "Pengeluaran",
  debt: "Hutang",
};

const TRANSACTION_SOURCE: Record<Transaction["source"], string> = {
  whatsapp: "WhatsApp",
  app: "Aplikasi",
  struk: "Struk",
};

const ORDER_STATUS: Record<Order["status"], string> = {
  baru: "Baru",
  dikonfirmasi: "Dikonfirmasi",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const PAYMENT_STATUS: Record<Payment["status"], string> = {
  menunggu: "Menunggu",
  cocok: "Cocok",
  tidak_cocok: "Tidak cocok",
};

const STOCK_MOVEMENT_KIND: Record<StockMovement["kind"], string> = {
  masuk: "Masuk",
  keluar: "Keluar",
  penyesuaian: "Penyesuaian",
};

const STOCK_ALERT_STATUS: Record<StockAlert["status"], string> = {
  aktif: "Aktif",
  selesai: "Selesai",
};

const APPROVAL_STATUS: Record<Approval["status"], string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

/** Jenis transaksi keuangan, misalnya `Penjualan`. */
export function transactionKindLabel(kind: Transaction["kind"]): string {
  return TRANSACTION_KIND[kind];
}

/** Asal transaksi keuangan, misalnya `WhatsApp`. */
export function transactionSourceLabel(source: Transaction["source"]): string {
  return TRANSACTION_SOURCE[source];
}

/** Keadaan orderan pelanggan, misalnya `Dikonfirmasi`. */
export function orderStatusLabel(status: Order["status"]): string {
  return ORDER_STATUS[status];
}

/** Hasil pencocokan bukti pembayaran, misalnya `Tidak cocok`. */
export function paymentStatusLabel(status: Payment["status"]): string {
  return PAYMENT_STATUS[status];
}

/** Jenis pergerakan stok, misalnya `Keluar`. */
export function stockMovementKindLabel(kind: StockMovement["kind"]): string {
  return STOCK_MOVEMENT_KIND[kind];
}

/** Keadaan alert stok menipis, misalnya `Aktif`. */
export function stockAlertStatusLabel(status: StockAlert["status"]): string {
  return STOCK_ALERT_STATUS[status];
}

/** Keadaan aksi pada antrean persetujuan, misalnya `Disetujui`. */
export function approvalStatusLabel(status: Approval["status"]): string {
  return APPROVAL_STATUS[status];
}
