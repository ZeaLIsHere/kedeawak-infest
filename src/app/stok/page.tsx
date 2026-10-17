import { Suspense } from "react";

import { CardError } from "@/components/shell/card-error";
import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";
import { ProductList, ProductListSkeleton } from "@/components/stock/product-list";
import {
  StockAlertList,
  StockAlertListSkeleton,
} from "@/components/stock/stock-alert-list";

/*
 * Tiap kartu dibungkus sama seperti Dasbor: kartu bagian menyediakan permukaan
 * dan judulnya, pembatas galat menjaga kegagalan tetap di dalam kartu itu saja,
 * dan batas Suspense menyediakan keadaan memuat.
 */

const JUDUL_ALERT = "Stok menipis";
const JUDUL_PRODUK = "Daftar produk";

export default function StokPage() {
  return (
    <>
      <PageHeader
        title="Stok dan Produk"
        description="Daftar produk, harga jual, dan sisa stok warung."
      />

      <div className="mx-auto flex w-full max-w-content flex-col gap-section p-page">
        <SectionCard title={JUDUL_ALERT}>
          <CardError title={JUDUL_ALERT}>
            <Suspense fallback={<StockAlertListSkeleton />}>
              <StockAlertList />
            </Suspense>
          </CardError>
        </SectionCard>

        <SectionCard title={JUDUL_PRODUK}>
          <CardError title={JUDUL_PRODUK}>
            <Suspense fallback={<ProductListSkeleton />}>
              <ProductList />
            </Suspense>
          </CardError>
        </SectionCard>
      </div>
    </>
  );
}
