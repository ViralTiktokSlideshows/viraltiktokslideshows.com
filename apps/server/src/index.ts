import { env } from "@viraltiktokslideshows/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// Mock generation endpoint. Returns the same 7-slide slideshow every time —
// stands in for the future Gemini + Ideogram pipeline described in the
// product spec so the frontend flow can be built against a stable contract.
app.post("/api/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const idea = typeof body?.idea === "string" ? body.idea : "";
  const formats = Array.isArray(body?.formats) ? body.formats : [];
  const vibes = Array.isArray(body?.vibes) ? body.vibes : [];

  const slides = [
    "Nobody tells you the first slide is the whole game",
    "Everyone's fighting for the first half-second of attention",
    "If slide one doesn't hook, slides 2-7 don't matter",
    "The best hooks promise a payoff, not just curiosity",
    "Structure beats cleverness: hook, tension, payoff",
    "Save-worthy slides give people a reason to screenshot",
    "Post it, then double down on what works",
  ];

  return c.json({
    id: "mock-slideshow-1",
    idea,
    formats,
    vibes,
    hook: slides[0],
    slideCount: slides.length,
    slides: slides.map((text, index) => ({ index: index + 1, text })),
  });
});

export default app;
