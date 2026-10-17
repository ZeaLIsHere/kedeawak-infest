import { describe, expect, it } from "vitest";

import {
  approvalStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  stockAlertStatusLabel,
  stockMovementKindLabel,
  transactionKindLabel,
  transactionSourceLabel,
} from "./labels";

/*
 * Nilai enum di basis data memakai bahasa Inggris untuk jenis transaksi, dan
 * bahasa Indonesia untuk nilai lainnya. Antarmuka selalu memakai bahasa
 * Indonesia, sehingga setiap nilai harus punya satu label tetap di sini.
 */
describe("label nilai basis data", () => {
  it("melabeli jenis transaksi", () => {
    expect(transactionKindLabel("sale")).toBe("Penjualan");
    expect(transactionKindLabel("expense")).toBe("Pengeluaran");
    expect(transactionKindLabel("debt")).toBe("Hutang");
  });

  it("melabeli asal transaksi", () => {
    expect(transactionSourceLabel("whatsapp")).toBe("WhatsApp");
    expect(transactionSourceLabel("app")).toBe("Aplikasi");
    expect(transactionSourceLabel("struk")).toBe("Struk");
  });

  it("melabeli keadaan orderan", () => {
    expect(orderStatusLabel("baru")).toBe("Baru");
    expect(orderStatusLabel("dikonfirmasi")).toBe("Dikonfirmasi");
    expect(orderStatusLabel("selesai")).toBe("Selesai");
  });

  it("melabeli hasil pencocokan pembayaran", () => {
    expect(paymentStatusLabel("menunggu")).toBe("Menunggu");
    expect(paymentStatusLabel("cocok")).toBe("Cocok");
    expect(paymentStatusLabel("tidak_cocok")).toBe("Tidak cocok");
  });

  it("melabeli jenis pergerakan stok", () => {
    expect(stockMovementKindLabel("masuk")).toBe("Masuk");
    expect(stockMovementKindLabel("keluar")).toBe("Keluar");
    expect(stockMovementKindLabel("penyesuaian")).toBe("Penyesuaian");
  });

  it("melabeli keadaan alert stok", () => {
    expect(stockAlertStatusLabel("aktif")).toBe("Aktif");
    expect(stockAlertStatusLabel("selesai")).toBe("Selesai");
  });

  it("melabeli keadaan aksi persetujuan", () => {
    expect(approvalStatusLabel("menunggu")).toBe("Menunggu");
    expect(approvalStatusLabel("disetujui")).toBe("Disetujui");
    expect(approvalStatusLabel("ditolak")).toBe("Ditolak");
  });

  it("tidak pernah menghasilkan tanda hubung", () => {
    const hasil = [
      transactionKindLabel("sale"),
      transactionSourceLabel("struk"),
      orderStatusLabel("dikonfirmasi"),
      paymentStatusLabel("tidak_cocok"),
      stockMovementKindLabel("penyesuaian"),
      stockAlertStatusLabel("selesai"),
      approvalStatusLabel("disetujui"),
    ];

    for (const label of hasil) {
      expect(label).not.toContain("-");
    }
  });
});
