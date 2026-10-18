import type { ReactNode } from "react";

type PageHeaderProps = {
  readonly title: string;
  readonly description: string;
  /** Tindakan utama halaman, ditempatkan sejajar judul pada layar lebar. */
  readonly action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="border-b-2 border-border bg-card px-page py-section">
      <div className="mx-auto flex w-full max-w-content flex-col gap-gutter sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-page-title font-bold">{title}</h1>
          <p className="mt-1 max-w-prose text-body font-medium text-muted-foreground">
            {description}
          </p>
        </div>
        {action === undefined ? null : <div className="sm:shrink-0">{action}</div>}
      </div>
    </header>
  );
}
