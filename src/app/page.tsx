import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function DasborPage() {
  return (
    <>
      <PageHeader title="Dasbor" description="Ringkasan keadaan warung hari ini." />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={LayoutDashboard}
          title="Belum ada transaksi tercatat"
          description="Catat penjualan pertama lewat percakapan dengan agen AI. Ringkasan penjualan, pengeluaran, dan laba akan tampil di sini."
        />
      </div>
    </>
  );
}
