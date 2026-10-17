import { ClipboardCheck } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function PersetujuanPage() {
  return (
    <>
      <PageHeader
        title="Persetujuan"
        description="Aksi agen yang menunggu persetujuan Anda sebelum dijalankan."
      />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={ClipboardCheck}
          title="Halaman ini belum berfungsi"
          description="Antrean persetujuan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan."
        />
      </div>
    </>
  );
}
