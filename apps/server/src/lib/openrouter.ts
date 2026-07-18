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
  // A concrete, literal description of the *background photo* this slide
  // should have -- a real scene a photographer could shoot, NOT the slide's
  // message. This is what actually gets searched on Pexels / handed to
  // Ideogram (see generate-slideshow.ts). Optional because a degraded model
  // response might omit it; downstream falls back to keyword-extracting the
  // slide text in that case (see stock-photos.ts).
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
// Claude Haiku 4.5: sharper, more "human" punchy copy for hooks than Gemini
// Flash, at a lower price ($1/$5 per 1M vs Gemini 3.5 Flash's $1.50/$9) --
// text is the cheap part of a generation either way (a fraction of one
// Ideogram image), so this is a quality upgrade with no real margin cost.
const MODEL = "anthropic/claude-haiku-4.5";

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
const BASE_SYSTEM_PROMPT = `You are a scriptwriter AND an art director for viral TikTok photo-slideshows. For one idea you produce a short deck where every slide has punchy overlay text AND a described background photo chosen specifically for that slide.

Return ONLY a JSON object, no markdown fences, no commentary, matching this exact shape:
{"slides": [{"text": "...", "visual": "...", "textPosition": "top"}, ...]}

## text (the words shown on the slide)
- 6 to 8 slides total.
- Slide 1 is the hook: it must earn the next slide in under a second — a bold claim, a specific number, a "nobody tells you" angle, or a direct question. No generic openers.
- Each slide's text is one short punchy line: no hashtags, no emoji, no slide numbers or labels.
- Hard cap: 8 words / 55 characters per slide. This renders as large bold overlay text on a photo — think "Ego is the enemy" or "Force consistency," not a full sentence with clauses. If an idea needs more room, cut it to its sharpest phrase.
- The deck should build: hook, tension/context, 3-5 payoff/insight slides, a closing line that lands the point.
- Confident, conversational voice — a smart friend explaining something, not a corporate caption.

## visual (the STOCK-PHOTO SEARCH TERM for that slide) — READ CAREFULLY
- This is a real search query typed into a stock photo site (Pexels), NOT the slide's message. It must return results, so keep it SHORT and COMMON.
- STRICT: 2 to 3 plain words. One concrete subject, optionally one setting/mood word. Nothing more.
- Use everyday, high-frequency nouns a big stock library definitely has. Think "gym workout", "stacks of cash", "man running", "city skyline", "empty road", "coffee desk", "ocean waves", "night city".
- Do NOT write descriptive sentences or rare compound phrases. BAD: "athlete stretching exhausted after intense training" (too long, no results). GOOD: "tired athlete" or "gym workout". BAD: "person alone scrolling phone dark room". GOOD: "phone in dark".
- NEVER put the slide's own words, the topic name, or abstract concepts in it. Translate the meaning into a common physical thing: a finance slide -> "stacks of cash", "luxury car", "modern mansion"; a fitness slide -> "gym workout", "running shoes", "barbell"; a focus/productivity slide -> "coffee desk", "person writing", "quiet office".
- No text/words/logos/charts in the photo. One clear subject per slide. Vary the subject across the deck — don't repeat the same one.

## textPosition (where the words sit)
- One of exactly: "top", "center", "bottom".
- Choose it PER SLIDE based on where the visual's subject sits, so the text lands in the emptiest part of that specific photo. Subject low/centered in frame -> "top". Big open sky, ceiling, or empty area up top -> "bottom". Minimal or evenly-filled scene -> "center".
- Deliberately vary it across the deck. A deck where every slide is "top" is wrong — different photos have empty room in different places.`;

// Applied invisibly from the signed-in user's Settings > Generation
// defaults preference (see /api/generate in index.ts) — there's no format
// picker step in the generate flow itself anymore, so this is the only
// place "format" actually does anything.
const FORMAT_DIRECTIVES: Record<SlideFormat, string> = {
  STORYTIME:
    "Style: a narrative arc — hook, rising tension/context, insight slides, a satisfying closing line. This is the default, story-driven style.",
  LISTICLE:
    'Style: a numbered list. The hook slide teases a count (e.g. "5 things nobody tells you about X"), and every following slide delivers exactly one item with a short, punchy explanation — no story arc, just the list.',
  HOT_TAKE:
    "Style: a bold, opinionated, slightly contrarian voice — like someone dropping an unpopular but well-argued take. The hook slide is a provocative claim, not a question, and the closing slide doubles down rather than softening it.",
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
): Promise<GeneratedSlideshowText> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${FORMAT_DIRECTIVES[format]}`;

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

  const rawSlides = parseSlidesJson(content);
  if (!rawSlides || rawSlides.length < 3) {
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
): Promise<GeneratedSlideshowText> {
  try {
    return await attemptGenerate(idea, format);
  } catch (err) {
    // One retry, not a loop: this is on the free, unauthenticated
    // /api/generate path, so a stuck upstream shouldn't turn into several
    // extra OpenRouter calls per visitor. A bad completion is usually a
    // one-off the same request succeeds at on a second try; a genuine
    // outage or auth failure will just fail the same way again and surface
    // to the caller as before.
    console.error("[openrouter] first attempt failed, retrying once", err);
    return await attemptGenerate(idea, format);
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
