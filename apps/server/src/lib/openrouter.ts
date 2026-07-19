import { env } from "@viraltiktokslideshows/env/server";

// Real slide-text generation via OpenRouter -> google/gemini-3.5-flash
// (OpenAI-compatible chat completions API). No SDK — this is a single
// endpoint with a plain fetch, not worth a dependency for.

// Where a slide's overlay text sits on the frame. Chosen per-slide by the
// model (see the system prompt) so a deck isn't one rigid layout repeated
// 8 times -- text goes wherever the slide's own background photo leaves
// the most empty room. Mirrored client-side in
// apps/web/src/components/generate/slide-text-style.ts (kept as a
// duplicated union there rather than a shared package, same reasoning as
// SlideFormat below).
export type SlideTextPosition = "top" | "center" | "bottom";

const TEXT_POSITIONS: readonly SlideTextPosition[] = ["top", "center", "bottom"];

// The two real-TikTok overlay-text looks (see the client's
// slide-text-style.ts): "boxed" = black text in white caption pills,
// "outlined" = white text with a dark outline. Assigned at random per
// slide below so a deck mixes both, the way real accounts do.
export type SlideTextStyle = "boxed" | "outlined";

const TEXT_STYLES: readonly SlideTextStyle[] = ["boxed", "outlined"];

export type GeneratedSlideText = {
  index: number;
  text: string;
  textStyle?: SlideTextStyle;
  // The library concept for this slide's background image -- ideally copied
  // verbatim from the injected "## image library" list (e.g. "dark aesthetic
  // gym", "stacks of cash"), NOT the slide's message. Used by library.ts to
  // resolve a real R2 image (exact match first, then fuzzy). Optional because a
  // degraded model response might omit it; retrieval then falls back to a
  // same-niche / global-random library image.
  visual?: string;
  textPosition?: SlideTextPosition;
};

export type GeneratedSlideshowText = {
  hook: string;
  slides: GeneratedSlideText[];
};

// Mirrors the Prisma SlideFormat enum (packages/db/prisma/schema/schema.prisma).
// Kept as a plain string union here rather than importing the generated
// enum — this file has no other Prisma dependency and the values are
// small/stable enough that duplicating them is cheaper than coupling a
// pure-fetch API client to the ORM's generated types.
export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Claude Sonnet 5: now that images are pulled from our own R2 library (free)
// instead of generated per-slide by Ideogram, the text model is the ONLY spend
// on a generation and it's tiny (~$0.01/deck). Sonnet is a real step up over
// Haiku at instruction-following, which matters here: it has to pick each
// slide's image concept from a live, finite list of what's actually in the
// library (see the vocabulary injected into the prompt) rather than inventing
// a search term. If this exact OpenRouter slug ever 404s, that's the thing to
// check first.
const MODEL = "anthropic/claude-sonnet-5";

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
};

// A hung upstream call shouldn't leave the user stuck on the loading step
// indefinitely — cut it off and let the caller surface a real error.
const REQUEST_TIMEOUT_MS = 30_000;

// The core instruction set. The single most important idea here: the model
// writes TWO different things per slide that must not be confused --
//   1. `text`   = the punchy words shown ON the slide.
//   2. `visual` = a plain description of the PHOTO behind those words.
// Early versions only asked for text, and the image layer then searched
// Pexels using the slide's own sentence ("Most viral advice is a lie"),
// which matches no stock photo and returned nothing. A slide's words and a
// slide's background are different jobs: "Ego is the enemy" is good text; the
// photo behind it is "a lone climber on a mountain ridge," not the sentence.
const BASE_SYSTEM_PROMPT = `You are a scriptwriter AND an art director for viral TikTok photo-slideshows. For one idea you produce a short deck where every slide has punchy overlay text AND a background image chosen for that slide from a fixed image library (listed below).

Return ONLY a JSON object, no markdown fences, no commentary, matching this exact shape:
{"slides": [{"text": "...", "visual": "...", "textPosition": "top"}, ...]}

## text (the words shown on the slide)
- Slide count is set by the STYLE block below — follow it exactly.
- Slide 1 is THE HOOK. Rules: 7 words or fewer, second person (talk to one person), and either a command or a curiosity gap — never a description or a label. No generic openers ("Here are...", "Top 5 ways...", soft questions that build no tension).
- Every other slide: one idea, one short line. Hard cap 10 words / 60 characters. Large bold overlay text like "Ego is the enemy" or "Force consistency" — not a sentence with clauses.
- No hashtags, emoji, slide numbers, or labels in the text.
- Write for the SAVE — give something worth keeping. In list decks every slide is one concrete, actionable step (checklist energy), not filler.
- Confident, conversational voice — a smart friend explaining something, not a corporate caption.

## hook principles — STUDY THESE, DO NOT COPY THEM
Below are 20 REAL hooks from viral slideshows. Do NOT reuse their words, phrasing, or topics. Extract the PRINCIPLES they share and apply those to THIS idea:
- short — most are under 8 words
- second person, spoken to one person, often a command
- a curiosity gap or a command, never a description
- concrete and plain — no clever wordplay
- implies a payoff worth swiping or saving for
Examples: "thank me later" | "As a father should." | "put that phone down and start doing something" | "clear your desk, tie your hair up, grab a coffee, and just start" | "save this for your next workout" | "books I finished vs books that finished me" | "keep doing." | "you got this" | "try one and report back" | "take the first step, you won't take the step back" | "the only academic comeback checklist you'll ever need" | "the most effective study method for each subject" | "lock in twin" | "damn." | "focus on your way, not what others think of you" | "the unglamorous version of having it together" | "learn something new every day before you sleep" | "books so good you'll fly through them" | "if I woke up without my memories I'm grabbing THESE first" | "cool girls read cool books"

## visual (WHICH LIBRARY IMAGE this slide uses) — READ CAREFULLY, STRICT
- Every background comes from our fixed image library, listed under "## image library" below: niches, each with the EXACT concepts available.
- Set "visual" to the concept from that list that best fits this slide, copied VERBATIM (e.g. "dark aesthetic gym", "cozy library", "stacks of cash"). It must be a string that appears in the library list.
- Do NOT invent concepts. If nothing fits perfectly, pick the closest available concept in the most relevant niche. Never output a concept that isn't in the list.
- Translate the slide's MESSAGE into a physical scene, then match it to a listed concept: a money line -> "stacks of cash" / "luxury car"; a focus line -> "coffee desk laptop" / "clean desk setup"; a gym line -> "barbell close up" / "dark aesthetic gym".
- Never put the slide's own words, the topic name, or abstract ideas in "visual".
- Vary concepts across the deck — pick different fitting concepts, don't stamp the same one on every slide.

## textPosition (where the words sit)
- One of exactly: "top", "center", "bottom".
- Choose it PER SLIDE based on where the visual's subject sits, so the text lands in the emptiest part of that specific photo. Subject low/centered in frame -> "top". Big open sky, ceiling, or empty area up top -> "bottom". Minimal or evenly-filled scene -> "center".
- Deliberately vary it across the deck. A deck where every slide is "top" is wrong — different photos have empty room in different places.`;

// Applied invisibly from the signed-in user's Settings > Generation
// defaults preference (see /api/generate in index.ts) — there's no format
// picker step in the generate flow itself anymore, so this is the only
// place "format" actually does anything.
// Slide counts are deliberately BIMODAL, from the research: viral slideshows
// cluster at 2-3 (punchy quote/claim) or 6-8 (a real list) -- almost nothing
// lands in a mushy 4-5, so we never target that range.
const FORMAT_DIRECTIVES: Record<SlideFormat, string> = {
  STORYTIME:
    "Style: a narrative arc across 6 to 8 slides — hook, rising tension/context, insight slides, a satisfying closing line. This is the default, story-driven style.",
  LISTICLE:
    'Style: a numbered list of 6 to 8 slides. The hook teases a count (e.g. "5 things nobody tells you about X") and every following slide delivers exactly ONE concrete, actionable item people would want to save — no story arc, just the list.',
  HOT_TAKE:
    "Style: a punchy QUOTE/CLAIM deck of just 2 to 3 slides — no list, no story arc. Slide 1 is a provocative claim or hard-hitting line; the final slide doubles down and lands it. Keep every line short and quotable.",
};

type RawSlide = { text: string; visual?: string; textPosition?: SlideTextPosition };

// Single attempt at the OpenRouter call -- pulled out of
// generateSlideshowText so that function can retry it once on a parse
// failure (see below) without duplicating the request/parsing logic.
// Whenever parsing comes up short the raw model content is logged
// (truncated) so a real regression is diagnosable instead of surfacing as
// a bare "unusable slide list" error string.
async function attemptGenerate(
  idea: string,
  format: SlideFormat,
  libraryVocabulary: string,
): Promise<GeneratedSlideshowText> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // The live library inventory is injected here, not baked into
  // BASE_SYSTEM_PROMPT, because it changes as the bucket fills. If it's empty
  // (library not populated yet) the model still writes a sensible concept and
  // downstream retrieval just falls back to whatever exists / no image.
  const librarySection = libraryVocabulary
    ? `## image library (choose every "visual" from these concepts)\n${libraryVocabulary}`
    : `## image library\n(no concepts available yet — still pick a short, concrete "visual" phrase)`;

  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${librarySection}\n\n${FORMAT_DIRECTIVES[format]}`;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.SERVER_URL,
        "X-Title": "Viral TikTok Slideshows",
      },
      body: JSON.stringify({
        model: MODEL,
        // No response_format: json_object. It's an OpenAI-ism that Anthropic
        // models (Claude) don't natively support, and some OpenRouter
        // providers 400 on it rather than ignoring it. We don't need it --
        // the system prompt demands raw JSON and parseSlidesJson strips any
        // ```json fences / preamble Claude tends to add, so parsing is
        // robust without forcing the parameter.
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Idea: ${idea}` },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[openrouter] response had no message content", JSON.stringify(data).slice(0, 500));
    throw new Error("OpenRouter returned no content");
  }

  // Minimum 2: HOT_TAKE quote decks are intentionally 2-3 slides now (see
  // FORMAT_DIRECTIVES). Below 2 there's no slideshow, so that's still a fail.
  const rawSlides = parseSlidesJson(content);
  if (!rawSlides || rawSlides.length < 2) {
    console.error(
      `[openrouter] unusable slide list (got ${rawSlides?.length ?? 0} slides) -- raw content:`,
      content.slice(0, 500),
    );
    throw new Error("OpenRouter returned an unusable slide list");
  }

  // One text look per slideshow (not per slide): real accounts keep a
  // single caption style consistent across a whole deck, so pick boxed OR
  // outlined once here and apply it to every slide.
  const deckStyle = TEXT_STYLES[Math.floor(Math.random() * TEXT_STYLES.length)];

  const slides: GeneratedSlideText[] = rawSlides.map((slide, i) => ({
    index: i + 1,
    text: slide.text,
    visual: slide.visual,
    // Fall back to rotating top/center/bottom by position so even a
    // response that omits textPosition still gets per-slide variety rather
    // than every slide defaulting to the same spot.
    textPosition: slide.textPosition ?? TEXT_POSITIONS[i % TEXT_POSITIONS.length],
    textStyle: deckStyle,
  }));

  const hookText = slides[0]?.text;
  if (hookText === undefined) {
    throw new Error("OpenRouter returned an unusable slide list");
  }

  return { hook: hookText, slides };
}

export async function generateSlideshowText(
  idea: string,
  format: SlideFormat = "STORYTIME",
  libraryVocabulary = "",
): Promise<GeneratedSlideshowText> {
  try {
    return await attemptGenerate(idea, format, libraryVocabulary);
  } catch (err) {
    // One retry, not a loop: this is on the free, unauthenticated
    // /api/generate path, so a stuck upstream shouldn't turn into several
    // extra OpenRouter calls per visitor. A bad completion is usually a
    // one-off the same request succeeds at on a second try; a genuine
    // outage or auth failure will just fail the same way again and surface
    // to the caller as before.
    console.error("[openrouter] first attempt failed, retrying once", err);
    return await attemptGenerate(idea, format, libraryVocabulary);
  }
}

// Models occasionally wrap JSON in markdown fences or add stray text
// around it even when explicitly told not to — strip fences and grab the
// first {...} block before parsing, rather than trusting the raw string.
// Tolerant on shape: accepts the current object form ({text, visual,
// textPosition}) and also a legacy bare-string slide ("just the text"), so
// a partially-off completion still yields usable slides instead of a hard
// failure.
function parseSlidesJson(raw: string): RawSlide[] | null {
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const fencedGroup = fenced?.[1];
  if (fencedGroup) text = fencedGroup.trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  text = text.slice(start, end + 1);

  try {
    const parsed = JSON.parse(text);
    const slides = parsed?.slides;
    if (!Array.isArray(slides)) return null;

    const cleaned: RawSlide[] = [];
    for (const slide of slides) {
      if (typeof slide === "string") {
        const t = slide.trim();
        if (t) cleaned.push({ text: t });
        continue;
      }
      if (slide && typeof slide === "object" && typeof slide.text === "string") {
        const t = slide.text.trim();
        if (!t) continue;
        const visual = typeof slide.visual === "string" ? slide.visual.trim() : undefined;
        const position: SlideTextPosition | undefined =
          typeof slide.textPosition === "string" &&
          (TEXT_POSITIONS as readonly string[]).includes(slide.textPosition)
            ? (slide.textPosition as SlideTextPosition)
            : undefined;
        cleaned.push({ text: t, visual: visual || undefined, textPosition: position });
      }
    }

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}
