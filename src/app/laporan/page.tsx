import { Suspense } from "react";
import { PaymentMethodSummary } from "@/components/reports/payment-method-summary";
import { connection } from "next/server";

import {
  PeriodSummary,
  PeriodSummarySkeleton,
} from "@/components/reports/period-summary";
import {
  PeriodSwitcher,
  PeriodSwitcherSkeleton,
  type ReportMode,
} from "@/components/reports/period-switcher";
import {
  TransactionList,
  TransactionListSkeleton,
} from "@/components/reports/transaction-list";
import { ExpenseForm } from "@/components/reports/expense-form";
import { CardError } from "@/components/shell/card-error";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { PageHeader } from "@/components/shell/page-header";
import { SectionCard } from "@/components/shell/section-card";
import {
  endOfDay,
  endOfWeek,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "@/lib/data/period";
import { summarizePayments, summarizeDay, summarizeWeek } from "@/lib/data/reports";
import { withCurrentBusiness } from "@/lib/data/server";
import { listTransactionsWithItems } from "@/lib/data/transactions";
import { formatDateRange, formatDateWithDay } from "@/lib/format/date";

const JUDUL_RINGKASAN = "Ringkasan periode";
const JUDUL_RINCIAN = "Rincian transaksi";

const DESKRIPSI_RINGKASAN = "Penjualan, pengeluaran, dan laba pada periode yang dipilih.";
const DESKRIPSI_RINCIAN =
  "Setiap transaksi pada periode yang dipilih, termasuk hutang pelanggan.";

export default function LaporanPage(props: PageProps<"/laporan">) {
  return (
    <>
      <PageHeader
        title="Laporan Keuangan"
        description="Penjualan, pengeluaran, dan laba warung pada periode yang dipilih."
      />

      <div className="mx-auto flex w-full max-w-content flex-col gap-section p-page">
        <SectionCard
          title="Catat pengeluaran"
          description="Pengeluaran yang dicatat di sini langsung masuk ke laporan dan ringkasan hari ini."
        >
          <ExpenseForm />
        </SectionCard>

        <CardError title="Laporan keuangan">
          <Suspense fallback={<LaporanSkeleton />}>
            <LaporanContent searchParams={props.searchParams} />
          </Suspense>
        </CardError>
      </div>
    </>
  );
}

/** Kerangka muat yang mengikuti susunan isi laporan. */
function LaporanSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      <PeriodSwitcherSkeleton />

      <SectionCard title={JUDUL_RINGKASAN} description={DESKRIPSI_RINGKASAN}>
        <PeriodSummarySkeleton />
      </SectionCard>

      <SectionCard title={JUDUL_RINCIAN} description={DESKRIPSI_RINCIAN}>
        <TransactionListSkeleton />
      </SectionCard>
    </div>
  );
}

/**
 * Isi laporan untuk periode yang sedang dibuka.
 *
 * `searchParams` adalah Promise, sehingga ditunggu di dalam batas Suspense:
 * kerangka halaman tetap statis dan isi laporan mengalir menyusul. Nilai
 * `periode` yang tidak dikenali kembali ke `harian`, dan `tanggal` yang tidak
 * sah kembali ke waktu berjalan, supaya alamat yang salah tidak menampilkan
 * halaman galat.
 */
async function LaporanContent({
  searchParams,
}: Pick<PageProps<"/laporan">, "searchParams">) {
  const params = await searchParams;

  await connection();

  const mode: ReportMode = params.periode === "mingguan" ? "mingguan" : "harian";
  const anchor =
    parseDateKey(typeof params.tanggal === "string" ? params.tanggal : undefined) ??
    new Date();

  const period =
    mode === "harian"
      ? { from: startOfDay(anchor), to: endOfDay(anchor) }
      : { from: startOfWeek(anchor), to: endOfWeek(anchor) };

  const data = await withCurrentBusiness(async (db, businessId) => {
    const summary =
      mode === "harian"
        ? await summarizeDay(db, businessId, anchor)
        : await summarizeWeek(db, businessId, anchor);
    const transactions = await listTransactionsWithItems(db, businessId, period);

    const payments = await summarizePayments(db, businessId, period);
    return { summary, transactions, payments };
  });

  if (data === undefined) {
    return <NoWarungState />;
  }

  /*
   * Batas atas periode tidak ikut dihitung, sehingga satu milidetik sebelumnya
   * adalah hari terakhir yang benar benar masuk ke dalam periode itu.
   */
  const label =
    mode === "harian"
      ? formatDateWithDay(period.from)
      : formatDateRange(period.from, new Date(period.to.getTime() - 1));

  /* Awal periode sebelumnya berjarak satu panjang periode, dan awal periode
   * berikutnya tepat sama dengan batas atas periode ini. */
  const span = period.to.getTime() - period.from.getTime();
  const previousHref = `/laporan?periode=${mode}&tanggal=${toDateKey(
    new Date(period.from.getTime() - span),
  )}`;
  const nextHref = `/laporan?periode=${mode}&tanggal=${toDateKey(period.to)}`;

  return (
    <div className="flex flex-col gap-section">
      <PeriodSwitcher
        mode={mode}
        label={label}
        previousHref={previousHref}
        nextHref={nextHref}
      />

      <SectionCard title={JUDUL_RINGKASAN} description={DESKRIPSI_RINGKASAN}>
        <PeriodSummary summary={data.summary} />
      </SectionCard>

      <SectionCard title="Uang masuk per jenis pembayaran">
        <PaymentMethodSummary summary={data.payments} />
      </SectionCard>
      <SectionCard title={JUDUL_RINCIAN} description={DESKRIPSI_RINCIAN}>
        <TransactionList transactions={data.transactions} />
      </SectionCard>
    </div>
  );
}
