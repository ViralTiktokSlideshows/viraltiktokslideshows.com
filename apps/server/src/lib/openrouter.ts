import { env } from "@viraltiktokslideshows/env/server";

// Real slide-text generation via OpenRouter -> google/gemini-3.5-flash
// (OpenAI-compatible chat completions API). No SDK — this is a single
// endpoint with a plain fetch, not worth a dependency for.

export type GeneratedSlideText = { index: number; text: string };

export type GeneratedSlideshowText = {
  hook: string;
  slides: GeneratedSlideText[];
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
};

// A hung upstream call shouldn't leave the user stuck on the loading step
// indefinitely — cut it off and let the caller surface a real error.
const REQUEST_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You write short, punchy TikTok slideshow scripts.

Return ONLY a JSON object, no markdown fences, no commentary, matching this exact shape:
{"slides": ["...", "...", "..."]}

Rules:
- 6 to 8 slides total.
- Slide 1 is the hook: it must earn the next slide in under a second — a bold claim, a specific number, a "nobody tells you" angle, or a direct question. No generic openers.
- Each slide is one short sentence: punchy, no hashtags, no emoji, no slide numbers or labels in the text itself.
- The deck should build: hook, tension/context, 3-5 payoff/insight slides, a closing slide that lands the point.
- Write in a confident, conversational voice — like a smart friend explaining something, not a corporate caption.`;

export async function generateSlideshowText(idea: string): Promise<GeneratedSlideshowText> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
          { role: "system", content: SYSTEM_PROMPT },
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
  if (!content) throw new Error("OpenRouter returned no content");

  const slideTexts = parseSlidesJson(content);
  if (!slideTexts || slideTexts.length < 3) {
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
