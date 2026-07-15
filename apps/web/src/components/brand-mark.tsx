import Image from "next/image";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

// The real brand mark, dropped in wherever the header/sidebar/auth shells
// need the small square logo unit. `logo-mark.png` is derived from the
// source file design supplied (apps/web/public/logo.jpg) -- that export is a
// tall banner with a lot of padded black canvas around the badge, so it's
// been cropped tight to the badge and had the surrounding canvas keyed out
// to transparency (the interlocking-triangle monogram itself stays opaque
// since it isn't connected to the outer black border). Keep both files: the
// original stays available for larger/full placements, this one is the
// small reusable unit.
//
// `className` sizes the badge (e.g. "size-7"); the image fills it.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex shrink-0", className)}>
      <Image
        src="/logo-mark.png"
        alt=""
        fill
        sizes="48px"
        className="object-contain"
        priority
      />
    </span>
  );
}
