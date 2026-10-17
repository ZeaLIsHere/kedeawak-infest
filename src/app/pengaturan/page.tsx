import { Settings } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function PengaturanPage() {
  return (
    <>
      <PageHeader title="Pengaturan" description="Kendali data dan privasi warung." />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={Settings}
          title="Halaman ini belum berfungsi"
          description="Keterangan koneksi nomor dan privasi data pelanggan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan."
        />
      </div>
    </>
  );
}
