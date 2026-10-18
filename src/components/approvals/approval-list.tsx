import { connection } from "next/server";
import { ApprovalDecision } from "./approval-decision";
import { SectionCard } from "@/components/shell/section-card";
import { NoWarungState } from "@/components/shell/no-warung-state";
import { listApprovalDetails, type ApprovalDetails } from "@/lib/data/approvals";
import { withCurrentBusiness } from "@/lib/data/server";
import { formatRupiah } from "@/lib/format/currency";
import { formatNumber } from "@/lib/format/number";
import { formatDateTime } from "@/lib/format/date";

export async function ApprovalList() {
  await connection();
  const data = await withCurrentBusiness((db, businessId) =>
    listApprovalDetails(db, businessId),
  );
  if (!data) return <NoWarungState />;
  const pending = data.filter((item) => item.approval.status === "menunggu");
  const history = data.filter((item) => item.approval.status !== "menunggu");
  return (
    <div className="flex flex-col gap-section">
      <SectionCard
        title="Menunggu persetujuan"
        description="Periksa pemasok, jumlah barang, dan perkiraan nilai sebelum mengambil keputusan."
      >
        {!pending.length ? (
          <p className="text-body text-muted-foreground">
            Tidak ada aksi yang menunggu persetujuan. Draft pesanan dapat dibuat dari
            alert pada halaman Stok.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((detail) => (
              <ApprovalCard key={detail.approval.id} detail={detail} />
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Riwayat keputusan">
        {!history.length ? (
          <p className="text-body text-muted-foreground">
            Belum ada keputusan tercatat. Hasil persetujuan atau penolakan akan muncul di
            sini.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {history.map((detail) => (
              <ApprovalCard key={detail.approval.id} detail={detail} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
function ApprovalCard({ detail }: { detail: ApprovalDetails }) {
  const { approval, order, items } = detail;
  const waiting = approval.status === "menunggu";
  return (
    <li
      data-testid={waiting ? "pending-approval" : "approval-history"}
      className="rounded-md border-2 border-border bg-card p-4 shadow-card"
    >
      <h3 className="text-body font-bold">{approval.summary}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-caption">
        <dt className="text-muted-foreground">Pemasok</dt>
        <dd>{order.supplierName}</dd>
        <dt className="text-muted-foreground">Diajukan</dt>
        <dd>{formatDateTime(approval.createdAt)}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          {waiting
            ? "Menunggu"
            : approval.status === "disetujui"
              ? "Disetujui"
              : "Ditolak"}
        </dd>
        <dt className="text-muted-foreground">Perkiraan nilai</dt>
        <dd className="tabular-nums">{formatRupiah(order.total)}</dd>
      </dl>
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-2 border-t border-border pt-2 text-body"
          >
            <span>
              {item.name} sebanyak {formatNumber(item.quantity)} {item.unit}
            </span>
            <span className="tabular-nums">
              {formatRupiah(item.quantity * item.estimatedPrice)}
            </span>
          </li>
        ))}
      </ul>
      {waiting ? (
        <ApprovalDecision approvalId={approval.id} />
      ) : (
        <p role="status" className="mt-3 text-body text-muted-foreground">
          {approval.status === "disetujui"
            ? "Draft pesanan disetujui dan stok produk terkait sudah ditambah."
            : "Draft pesanan ditolak. Stok produk tidak berubah."}
          {approval.decidedAt ? ` Diputuskan ${formatDateTime(approval.decidedAt)}.` : ""}
        </p>
      )}
    </li>
  );
}
