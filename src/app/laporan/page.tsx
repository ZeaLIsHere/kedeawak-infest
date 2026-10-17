import { ChartColumn } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function LaporanPage() {
  return (
    <>
      <PageHeader
        title="Laporan Keuangan"
        description="Penjualan, pengeluaran, dan laba dalam satu periode."
      />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={ChartColumn}
          title="Belum ada laporan"
          description="Catat penjualan lebih dulu. Setelah ada transaksi, ringkasan harian dan bulanan tersusun otomatis di sini."
        />
      </div>
    </>
  );
}
