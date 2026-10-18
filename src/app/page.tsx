import { ShoppingBag, TriangleAlert, Wallet } from "lucide-react";
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
import { RefreshDashboardButton } from "@/components/dashboard/refresh-dashboard-button";
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
      <PageHeader
        title="Dasbor"
        description="Ringkasan keadaan warung hari ini."
        action={<RefreshDashboardButton />}
      />

      <div className="mx-auto flex w-full max-w-content flex-col gap-section p-page">
        <SectionCard
          title={JUDUL_RINGKASAN}
          description="Uang masuk, uang keluar, dan laba bersih hari ini."
          icon={Wallet}
        >
          <CardError title={JUDUL_RINGKASAN}>
            <Suspense fallback={<TodaySummarySkeleton />}>
              <TodaySummary />
            </Suspense>
          </CardError>
        </SectionCard>

        <div className="grid items-start gap-section xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <SectionCard
              title={JUDUL_ORDERAN}
              description="Orderan hari ini dan produk yang paling banyak terjual minggu ini."
              icon={ShoppingBag}
            >
              <CardError title={JUDUL_ORDERAN}>
                <Suspense fallback={<OrderHighlightsSkeleton />}>
                  <OrderHighlights />
                </Suspense>
              </CardError>
            </SectionCard>
          </div>

          <SectionCard
            title={JUDUL_STOK}
            description="Produk yang sudah menyentuh atau melewati ambang minimum."
            icon={TriangleAlert}
            tone="warning"
          >
            <CardError title={JUDUL_STOK}>
              <Suspense fallback={<StockAlertPreviewSkeleton />}>
                <StockAlertPreview />
              </Suspense>
            </CardError>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
