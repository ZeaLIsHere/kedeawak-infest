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
          title="Belum ada data pelanggan tersimpan"
          description="Enkripsi nama dan nomor telepon pelanggan, serta permintaan penghapusan data pelanggan, berada di halaman ini."
        />
      </div>
    </>
  );
}
