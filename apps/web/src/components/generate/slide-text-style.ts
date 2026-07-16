// Shared visual spec for how slide text gets rendered, matched to how text
// actually looks on real viral TikTok slideshows. Two distinct treatments,
// both pulled from reference slideshows:
//
//   - "boxed": black text inside solid white rounded pills, one pill per
//     line -- TikTok's default caption-sticker look (e.g. "Ego is the
//     enemy" over a busy bookshelf). Reads on ANY background.
//   - "outlined": bold white text with a thin dark outline and soft shadow,
//     no background box (e.g. "Force consistency" over a dim room). Cleaner
//     look for calmer photos.
//
// A slide carries both a position (top/center/bottom) and a style
// (boxed/outlined); the style is picked at generation time so a deck mixes
// the two the way real accounts do. The same ratios drive the live
// phone-mockup preview (CSS, SlideshowPhonePreview) and the full-resolution
// download (canvas, lib/compose-slide-image.ts) so they match.

export type SlideTextPosition = "top" | "center" | "bottom";
export type SlideTextStyle = "boxed" | "outlined";

export const SLIDE_TEXT_STYLE = {
  // Text block max width, as a fraction of frame width.
  maxWidthRatio: 0.82,
  // Font size as a fraction of frame width -- scales with resolution.
  fontSizeRatio: 0.066,
  lineHeightRatio: 1.32,
  fontWeight: 700,
  // Distance of the top/bottom block from its edge, as a fraction of frame
  // height. Deliberately generous (not jammed to the edge) so text sits in
  // the upper/lower third with breathing room and leaves the photo's
  // subject visible, the way hand-placed TikTok captions do.
  edgeInsetRatio: 0.14,

  // --- outlined style ---
  // Outline (stroke) width as a fraction of font size. Kept moderate so it
  // reads like TikTok's outline mode, not a heavy cartoon stroke.
  outlineWidthRatio: 0.09,

  // --- boxed style ---
  // Padding inside each white pill, as a fraction of font size.
  boxPadXRatio: 0.34,
  boxPadYRatio: 0.14,
  // Corner radius of each pill, as a fraction of font size.
  boxRadiusRatio: 0.32,
  // Vertical gap between stacked per-line pills, as a fraction of font size.
  boxGapRatio: 0.14,
} as const;

// Resolves the top edge (px) of the text block for a vertical position,
// given the frame height and the measured height of the wrapped block.
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

// The flex justify-content value that lands the CSS-preview block at the
// same vertical anchor the canvas uses.
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

// A small, deterministic per-slide nudge so text doesn't look mechanically
// centered and edge-aligned -- real TikTok captions are placed by hand and
// sit a little differently on every slide. Derived from the slide's own
// text so it's stable across reloads and identical between the live preview
// and the downloaded image. Returns fractions of the frame width/height:
// horizontal drifts up to ~5%, vertical up to ~3%.
export function naturalJitter(seed: string): { xRatio: number; yRatio: number } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = Math.abs(h);
  const xRatio = ((a % 1000) / 1000 - 0.5) * 0.1;
  const yRatio = (((a >> 10) % 1000) / 1000 - 0.5) * 0.06;
  return { xRatio, yRatio };
}
