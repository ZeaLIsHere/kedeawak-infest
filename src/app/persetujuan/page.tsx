import { Suspense } from "react";
import { ApprovalList } from "@/components/approvals/approval-list";
import { PageHeader } from "@/components/shell/page-header";
import { CardError } from "@/components/shell/card-error";
import { Skeleton } from "@/components/shell/skeleton";
export default function PersetujuanPage() {
  return (
    <>
      <PageHeader
        title="Persetujuan"
        description="Aksi agen yang menunggu persetujuan Anda sebelum dijalankan."
      />
      <div className="mx-auto w-full max-w-content p-page">
        <CardError title="Persetujuan">
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <ApprovalList />
          </Suspense>
        </CardError>
      </div>
    </>
  );
}
