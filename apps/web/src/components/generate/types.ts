export interface GeneratedSlide {
  index: number;
  text: string;
  // Ideogram background image URL. Only the hook (slide 1) has one right
  // after /api/generate — the rest fill in once someone actually unlocks
  // (see apps/server/src/lib/generate-slideshow.ts). These URLs are
  // ephemeral, so a slide with no imageUrl (or an expired one) should
  // fall back to the striped placeholder treatment, not break the layout.
  imageUrl?: string;
}

export interface GeneratedSlideshow {
  id: string;
  idea: string;
  formats: string[];
  vibes: string[];
  hook: string;
  slideCount: number;
  slides: GeneratedSlide[];
}
