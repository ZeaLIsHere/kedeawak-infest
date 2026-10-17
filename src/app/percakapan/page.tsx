import { Bot } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function PercakapanPage() {
  return (
    <>
      <PageHeader
        title="Percakapan dengan Agen AI"
        description="Tanya keadaan warung dan catat penjualan lewat percakapan."
      />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={Bot}
          title="Halaman ini belum berfungsi"
          description="Percakapan dengan agen AI belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan."
        />
      </div>
    </>
  );
}
