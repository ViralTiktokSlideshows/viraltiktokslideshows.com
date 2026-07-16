import { env } from "@viraltiktokslideshows/env/server";

// Real slide-text generation via OpenRouter -> google/gemini-3.5-flash
// (OpenAI-compatible chat completions API). No SDK — this is a single
// endpoint with a plain fetch, not worth a dependency for.

export type GeneratedSlideText = { index: number; text: string };

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
const MODEL = "google/gemini-3.5-flash";

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
};

// A hung upstream call shouldn't leave the user stuck on the loading step
// indefinitely — cut it off and let the caller surface a real error.
const REQUEST_TIMEOUT_MS = 30_000;

const BASE_SYSTEM_PROMPT = `You write short, punchy TikTok slideshow scripts.

Return ONLY a JSON object, no markdown fences, no commentary, matching this exact shape:
{"slides": ["...", "...", "..."]}

Rules:
- 6 to 8 slides total.
- Slide 1 is the hook: it must earn the next slide in under a second — a bold claim, a specific number, a "nobody tells you" angle, or a direct question. No generic openers.
- Each slide is one short sentence: punchy, no hashtags, no emoji, no slide numbers or labels in the text itself.
- Hard cap: 8 words / 55 characters per slide, no exceptions. This text gets rendered as large, bold overlay text on top of a photo — think "Ego is the enemy" or "Force consistency," not a full sentence with clauses. If an idea needs more than that to land, cut it down to its sharpest phrase rather than shortening word-by-word.
- The deck should build: hook, tension/context, 3-5 payoff/insight slides, a closing slide that lands the point.
- Write in a confident, conversational voice — like a smart friend explaining something, not a corporate caption.`;

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

// Single attempt at the OpenRouter call -- pulled out of
// generateSlideshowText so that function can retry it once on a parse
// failure (see below) without duplicating the request/parsing logic.
// Previously, "OpenRouter returned an unusable slide list" was thrown with
// no record of what the model actually said, so a production failure like
// this had no way to tell a genuine schema regression apart from an
// ordinary one-off bad completion (LLMs occasionally return truncated or
// off-shape JSON even with response_format: json_object, which only
// guarantees valid JSON, not a specific shape) -- the raw content is now
// logged (truncated) whenever parsing comes up short, so the next
// occurrence is diagnosable instead of a bare error string.
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
        response_format: { type: "json_object" },
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

  const slideTexts = parseSlidesJson(content);
  if (!slideTexts || slideTexts.length < 3) {
    console.error(
      `[openrouter] unusable slide list (got ${slideTexts?.length ?? 0} slides) -- raw content:`,
      content.slice(0, 500),
    );
    throw new Error("OpenRouter returned an unusable slide list");
  }

  const hookText = slideTexts[0];
  if (hookText === undefined) {
    throw new Error("OpenRouter returned an unusable slide list");
  }

  return {
    hook: hookText,
    slides: slideTexts.map((text, i) => ({ index: i + 1, text })),
  };
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
    // extra OpenRouter calls per visitor. A bad completion (unusable slide
    // list) is usually a one-off the same request succeeds at on a second
    // try; a genuine outage or auth failure will just fail the same way
    // again and surface to the caller as before.
    console.error("[openrouter] first attempt failed, retrying once", err);
    return await attemptGenerate(idea, format);
  }
}

// Models occasionally wrap JSON in markdown fences or add stray text
// around it even when explicitly told not to — strip fences and grab the
// first {...} block before parsing, rather than trusting the raw string.
function parseSlidesJson(raw: string): string[] | null {
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

    const cleaned = slides
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0);

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}
