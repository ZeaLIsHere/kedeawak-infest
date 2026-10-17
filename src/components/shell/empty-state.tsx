import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  readonly icon: LucideIcon;
  readonly title: string;
  /** Sebutkan langkah berikutnya, bukan hanya keadaan kosongnya. */
  readonly description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-page py-section text-center">
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
      <p className="text-section-title font-semibold">{title}</p>
      <p className="max-w-md text-body text-muted-foreground">{description}</p>
    </div>
  );
}
