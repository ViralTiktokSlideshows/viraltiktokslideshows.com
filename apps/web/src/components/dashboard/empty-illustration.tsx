import { ImageIcon } from "lucide-react";

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]";

export function EmptyIllustration() {
  return (
    <div className="relative mx-auto h-40 w-32">
      <div className={`absolute inset-0 -rotate-6 rounded-2xl border border-border ${STRIPES}`} />
      <div className={`absolute inset-0 rotate-6 rounded-2xl border border-border ${STRIPES}`} />
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
        <ImageIcon className="size-6 text-muted-foreground" />
      </div>
    </div>
  );
}
