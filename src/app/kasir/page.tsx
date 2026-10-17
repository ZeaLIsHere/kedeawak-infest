import { Suspense } from "react";
import { connection } from "next/server";
import { Cashier } from "@/components/kasir/cashier";
import { PageHeader } from "@/components/shell/page-header";
import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { Skeleton } from "@/components/shell/skeleton";
import { listProducts } from "@/lib/data/products";
import { withCurrentBusiness } from "@/lib/data/server";

export default function KasirPage() {
  return (
    <>
      <PageHeader
        title="Kasir"
        description="Pilih produk, periksa pesanan, lalu catat pembayaran pelanggan."
      />
      <div className="mx-auto w-full max-w-content p-page">
        <CardError title="Kasir">
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <KasirContent />
          </Suspense>
        </CardError>
      </div>
    </>
  );
}
async function KasirContent() {
  await connection();
  const products = await withCurrentBusiness((db, businessId) =>
    listProducts(db, businessId),
  );
  return products === undefined ? <NoWarungState /> : <Cashier products={products} />;
}
