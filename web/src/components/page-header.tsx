export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-1 text-muted-foreground text-sm md:text-base">
          {description}
        </p>
      ) : null}
    </header>
  );
}
