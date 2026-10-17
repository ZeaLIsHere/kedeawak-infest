type PageHeaderProps = {
  readonly title: string;
  readonly description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-page py-section">
      <div className="mx-auto w-full max-w-content">
        <h1 className="text-page-title font-semibold">{title}</h1>
        <p className="mt-1 max-w-prose text-body text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}
