// Shared visual spec for how slide text gets rendered, extracted from
// studying real viral book/lifestyle TikTok slideshow accounts: bold
// white text with a black stroke (so it reads regardless of what's behind
// it), sized large enough to catch a fast scroll.
//
// Two consumers share these ratios so the live phone-mockup preview
// (SlideshowPhonePreview, approximated via CSS at a fixed small size) and
// the actual exported/downloaded image (composed at full resolution on an
// offscreen canvas — see lib/compose-slide-image.ts) read as the same
// design at different sizes, not two different treatments.

// Where a slide's text sits vertically. Chosen per-slide by the model
// (server side: openrouter.ts's SlideTextPosition) and carried on each
// slide object, so a deck isn't one rigid layout repeated on every slide --
// the background photo for each slide is composed to leave a different zone
// empty (see ideogram.ts), and the text is drawn into that zone here.
// Duplicated as a plain union rather than shared from the server package,
// same reasoning as the SlideFormat union in purchases-client.ts.
export type SlideTextPosition = "top" | "center" | "bottom";

export const SLIDE_TEXT_STYLE = {
  // Text block width, as a fraction of the frame's width, centered.
  maxWidthRatio: 0.84,
  // Font size, as a fraction of the frame's width — scales with
  // resolution instead of a fixed pixel value so it looks proportionally
  // right whether it's drawn on the small preview or the full-size export.
  fontSizeRatio: 0.072,
  lineHeightRatio: 1.15,
  // Relative to font size, not frame width.
  strokeWidthRatio: 0.055,
  // Heaviest Clash Display weight actually loaded (see apps/web/src/app/layout.tsx) — there's no 900/Black cut, so 700 is the ceiling.
  fontWeight: 700,
  // How far the top/bottom text blocks sit from their edge, as a fraction
  // of the frame's height. The image prompt keeps these zones quiet.
  edgeInsetRatio: 0.07,
} as const;

// Resolves the top edge (in pixels) of the text block for a given vertical
// position, given the frame height and the already-measured height of the
// wrapped text block. Used by the canvas compositor, which knows the exact
// block height; the CSS preview uses flex alignment instead (see
// SlideshowPhonePreview) but targets the same three anchors.
export function textBlockTop(
  position: SlideTextPosition,
  frameHeight: number,
  blockHeight: number,
): number {
  const inset = frameHeight * SLIDE_TEXT_STYLE.edgeInsetRatio;
  switch (position) {
    case "bottom":
      return frameHeight - inset - blockHeight;
    case "center":
      return Math.max(inset, (frameHeight - blockHeight) / 2);
    case "top":
    default:
      return inset;
  }
}

// The flex `justify-content` value that lands a text block at the same
// vertical anchor in the CSS preview as textBlockTop() does on the canvas.
export function justifyForPosition(position: SlideTextPosition): "flex-start" | "center" | "flex-end" {
  switch (position) {
    case "bottom":
      return "flex-end";
    case "center":
      return "center";
    case "top":
    default:
      return "flex-start";
  }
}
