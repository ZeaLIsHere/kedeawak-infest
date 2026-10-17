import { Suspense } from "react";

import {
  OrderHighlights,
  OrderHighlightsSkeleton,
} from "@/components/dashboard/order-highlights";
import {
  StockAlertPreview,
  StockAlertPreviewSkeleton,
} from "@/components/dashboard/stock-alert-preview";
import { TodaySummary, TodaySummarySkeleton } from "@/components/dashboard/today-summary";
import { CardError } from "@/components/shell/card-error";
import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";

/*
 * Tiap kartu dibungkus berlapis. Kartu bagian menyediakan permukaan dan
 * judulnya, pembatas galat menjaga kegagalan tetap di dalam kartu itu saja, dan
 * batas Suspense menyediakan keadaan memuat. Judul sengaja berada di luar
 * pembatas galat supaya pemakai tetap tahu bagian mana yang gagal.
 */

const JUDUL_RINGKASAN = "Ringkasan hari ini";
const JUDUL_ORDERAN = "Orderan dan produk terlaris";
const JUDUL_STOK = "Stok menipis";

export default function DasborPage() {
  return (
    <>
      <PageHeader title="Dasbor" description="Ringkasan keadaan warung hari ini." />

      <div className="mx-auto flex w-full max-w-content flex-col gap-section p-page">
        <SectionCard title={JUDUL_RINGKASAN}>
          <CardError title={JUDUL_RINGKASAN}>
            <Suspense fallback={<TodaySummarySkeleton />}>
              <TodaySummary />
            </Suspense>
          </CardError>
        </SectionCard>

        <SectionCard title={JUDUL_ORDERAN}>
          <CardError title={JUDUL_ORDERAN}>
            <Suspense fallback={<OrderHighlightsSkeleton />}>
              <OrderHighlights />
            </Suspense>
          </CardError>
        </SectionCard>

        <SectionCard title={JUDUL_STOK}>
          <CardError title={JUDUL_STOK}>
            <Suspense fallback={<StockAlertPreviewSkeleton />}>
              <StockAlertPreview />
            </Suspense>
          </CardError>
        </SectionCard>
      </div>
    </>
  );
}
