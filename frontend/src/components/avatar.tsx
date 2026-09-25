import { cn } from "@/lib/utils";

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase",
        className,
      )}
      aria-hidden
    >
      {name.charAt(0)}
    </div>
  );
}
