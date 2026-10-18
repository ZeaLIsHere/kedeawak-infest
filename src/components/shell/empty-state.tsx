type EmptyStateProps = {
  readonly title: string;
  /** Sebutkan langkah berikutnya, bukan hanya keadaan kosongnya. */
  readonly description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-border-strong bg-card px-page py-section text-center">
      <p className="text-section-title font-bold">{title}</p>
      <p className="max-w-md text-body font-medium text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
