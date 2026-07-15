import { cn } from "@viraltiktokslideshows/ui/lib/utils";

// Same interlocking-triangle "V" monogram as app/opengraph-image.tsx,
// redrawn as a normal (Tailwind-classable) SVG component — Satori's
// ImageResponse can't consume Tailwind classes, so that file keeps its own
// copy with inline styles. Path data is kept identical between the two so
// the mark reads the same everywhere it appears.
export function BrandMonogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 22 L50 76 L84 22"
        stroke="currentColor"
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M50 14 L68 40 L32 40 Z" fill="currentColor" />
    </svg>
  );
}

// The badge + mark together — this is the reusable "logo" unit dropped into
// the marketing header and the dashboard sidebar. `className` sizes the
// badge itself (e.g. "size-7"); the monogram scales to fill most of it.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-void text-bone",
        className,
      )}
    >
      <BrandMonogram className="size-[58%]" />
    </span>
  );
}
