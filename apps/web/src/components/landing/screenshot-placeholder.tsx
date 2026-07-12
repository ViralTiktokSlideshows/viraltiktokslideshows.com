import { ImageIcon } from "lucide-react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

export function ScreenshotPlaceholder({
  label,
  hint,
  className,
}: {
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border bg-muted/50 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-2xl border border-dashed border-brand-muted/50 text-brand-muted">
        <ImageIcon className="size-4" />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="text-xs text-brand-muted/80">{hint}</p> : null}
    </div>
  );
}
