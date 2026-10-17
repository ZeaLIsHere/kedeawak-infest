import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function WhatsappPage() {
  return (
    <>
      <PageHeader
        title="Integrasi WhatsApp"
        description="Sambungkan nomor WhatsApp warung supaya pesan pelanggan tercatat otomatis."
      />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={MessageCircle}
          title="Halaman ini belum berfungsi"
          description="Status kanal WhatsApp dan pesan pelanggan belum ditampilkan di sini. Data warung yang sudah tercatat bisa dibuka dari halaman Dasbor, Stok, dan Laporan."
        />
      </div>
    </>
  );
}
