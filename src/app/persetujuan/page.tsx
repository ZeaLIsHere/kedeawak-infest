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
          title="Tidak ada yang menunggu persetujuan"
          description="Aksi yang mengubah data warung akan berhenti di sini dan menunggu persetujuan Anda lebih dulu."
        />
      </div>
    </>
  );
}
