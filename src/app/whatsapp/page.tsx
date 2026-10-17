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
          title="Nomor WhatsApp belum terhubung"
          description="Hubungkan nomor warung lebih dulu. Setelah tersambung, orderan pelanggan masuk ke KedeAwak tanpa perlu dicatat manual."
        />
      </div>
    </>
  );
}
