import { Boxes } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";

export default function StokPage() {
  return (
    <>
      <PageHeader
        title="Stok dan Produk"
        description="Daftar produk, harga jual, dan sisa stok warung."
      />

      <div className="mx-auto w-full max-w-content p-page">
        <EmptyState
          icon={Boxes}
          title="Belum ada produk tercatat"
          description="Sebutkan produk dan harganya lewat percakapan dengan agen AI. Daftar produk akan muncul di sini."
        />
      </div>
    </>
  );
}
