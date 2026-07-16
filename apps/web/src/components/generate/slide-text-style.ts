// Shared visual spec for how slide text gets rendered, extracted from
// studying real viral book/lifestyle TikTok slideshow accounts: bold
// white text with a black stroke (so it reads regardless of what's behind
// it), sized large enough to catch a fast scroll, positioned in the upper
// portion of the frame — background images are deliberately composed
// (see apps/server/src/lib/ideogram.ts's buildImagePrompt) to keep that
// zone visually quiet, so the text never fights the photo's subject for
// attention instead of sitting in a bottom gradient band over it.
//
// Two consumers share these ratios so the live phone-mockup preview
// (SlideshowPhonePreview, approximated via CSS at a fixed small size) and
// the actual exported/downloaded image (composed at full resolution on an
// offscreen canvas — see lib/compose-slide-image.ts) read as the same
// design at different sizes, not two different treatments.
export const SLIDE_TEXT_STYLE = {
  // Distance from the top of the frame to the first line of text, as a
  // fraction of the frame's height.
  topOffsetRatio: 0.09,
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
} as const;
