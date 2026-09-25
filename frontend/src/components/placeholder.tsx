export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <div className="border-b px-4 py-3 md:sticky md:top-0 md:bg-background/90 md:backdrop-blur">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <p className="p-6 text-sm text-muted-foreground">
        Coming in a later step.
      </p>
    </div>
  );
}
