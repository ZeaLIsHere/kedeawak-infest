import type { PaymentSummary } from "@/lib/data/reports";
import { formatRupiah } from "@/lib/format/currency";
export function PaymentMethodSummary({ summary }: { summary: PaymentSummary }) {
  const rows = [
    { label: "Tunai", value: summary.tunai },
    { label: "Transfer", value: summary.transfer },
    { label: "QRIS", value: summary.qris },
    ...(summary.belumDiketahui > 0
      ? [{ label: "Belum diketahui", value: summary.belumDiketahui }]
      : []),
  ];
  const total = summary.tunai + summary.transfer + summary.qris + summary.belumDiketahui;
  return (
    <dl className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 text-body">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular-nums">
            {row.value ? formatRupiah(row.value) : "Belum ada data"}
          </dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-border pt-3 text-body font-semibold">
        <dt>Jumlah uang masuk</dt>
        <dd className="tabular-nums">{formatRupiah(total)}</dd>
      </div>
    </dl>
  );
}
