export interface GeneratedSlide {
  index: number;
  text: string;
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

// Used if the mock server request fails for any reason (e.g. server not
// running locally) so the flow can still be demoed end to end.
export const FALLBACK_SLIDESHOW: GeneratedSlideshow = {
  id: "fallback-slideshow",
  idea: "",
  formats: [],
  vibes: [],
  hook: "Nobody tells you the first slide is the whole game",
  slideCount: 7,
  slides: [
    { index: 1, text: "Nobody tells you the first slide is the whole game" },
    { index: 2, text: "Everyone's fighting for the first half-second of attention" },
    { index: 3, text: "If slide one doesn't hook, slides 2-7 don't matter" },
    { index: 4, text: "The best hooks promise a payoff, not just curiosity" },
    { index: 5, text: "Structure beats cleverness: hook, tension, payoff" },
    { index: 6, text: "Save-worthy slides give people a reason to screenshot" },
    { index: 7, text: "Post it, then double down on what works" },
  ],
};
