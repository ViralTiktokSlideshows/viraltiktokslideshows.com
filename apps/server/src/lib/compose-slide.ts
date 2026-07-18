import { existsSync } from "node:fs";

import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

// Bakes a slide's overlay text onto its background image, SERVER-SIDE, in the
// same two TikTok treatments the live preview uses (see the web app's
// slide-text-style.ts):
//   - "boxed": black text in per-line white pills.
//   - "outlined": white text with a dark outline + soft shadow.
//
// This moved off the browser on purpose. Client-side Canvas compositing kept
// failing in the field (image-decode hangs, silent toBlob failures) and
// falling back to a text-less download. Doing it here -- where the runtime is
// fixed and a font is guaranteed installed (see apps/server/Dockerfile) --
// makes "the text is on the downloaded image" reliable, and lets the browser
// just point a plain <a download> at the endpoint.

export type SlideTextPosition = "top" | "center" | "bottom";
export type SlideTextStyle = "boxed" | "outlined";

// Kept in sync with the web app's slide-text-style.ts SLIDE_TEXT_STYLE so the
// download matches the on-screen preview exactly.
const SLIDE_TEXT_STYLE = {
  maxWidthRatio: 0.82,
  fontSizeRatio: 0.066,
  lineHeightRatio: 1.32,
  fontWeight: 700,
  edgeInsetRatio: 0.14,
  outlineWidthRatio: 0.09,
  boxPadXRatio: 0.34,
  boxPadYRatio: 0.14,
  boxRadiusRatio: 0.32,
  boxGapRatio: 0.14,
} as const;

// Register a bundled/installed sans-serif under a stable alias so ctx.font can
// name it regardless of platform. Prefers Liberation Sans (Arial-metric,
// closest to the app's Inter), then DejaVu; both are installed by the
// Dockerfile. Falls back to loading system fonts for local dev on macOS/
// Windows. registerFromPath returns false (doesn't throw) for a missing file.
const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

let FONT_FAMILY = "sans-serif";
for (const path of FONT_CANDIDATES) {
  try {
    if (existsSync(path) && GlobalFonts.registerFromPath(path, "SlideFont")) {
      FONT_FAMILY = "SlideFont";
      break;
    }
  } catch {
    // Ignore and try the next candidate.
  }
}
if (FONT_FAMILY === "sans-serif") {
  try {
    GlobalFonts.loadSystemFonts();
  } catch {
    // No system fonts available; sans-serif fallback still renders.
  }
}

function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function roundRectPath(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function textBlockTop(position: SlideTextPosition, frameHeight: number, blockHeight: number): number {
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

// Deterministic per-slide nudge, identical to the web app's naturalJitter, so
// the download lands the text at the same hand-placed offset as the preview.
function naturalJitter(seed: string): { xRatio: number; yRatio: number } {
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

export type ComposedImage = { buffer: Buffer; contentType: string };

// Draws the text onto the image and returns a finished JPEG. Throws if the
// source bytes can't be decoded -- the caller falls back to the bare photo.
export async function composeSlideImage(
  imageBytes: Uint8Array,
  text: string,
  textPosition: SlideTextPosition = "top",
  textStyle: SlideTextStyle = "boxed",
): Promise<ComposedImage> {
  const img = await loadImage(Buffer.from(imageBytes));
  const width = img.width;
  const height = img.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const fontSize = Math.round(width * SLIDE_TEXT_STYLE.fontSizeRatio);
  const lineHeight = fontSize * SLIDE_TEXT_STYLE.lineHeightRatio;
  const maxWidth = width * SLIDE_TEXT_STYLE.maxWidthRatio;

  ctx.font = `${SLIDE_TEXT_STYLE.fontWeight} ${fontSize}px "${FONT_FAMILY}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapLines(ctx, text, maxWidth);
  const jitter = naturalJitter(text);
  const centerX = width / 2 + jitter.xRatio * width;
  const jitterY = jitter.yRatio * height;

  if (textStyle === "boxed") {
    const padX = fontSize * SLIDE_TEXT_STYLE.boxPadXRatio;
    const padY = fontSize * SLIDE_TEXT_STYLE.boxPadYRatio;
    const radius = fontSize * SLIDE_TEXT_STYLE.boxRadiusRatio;
    const gap = fontSize * SLIDE_TEXT_STYLE.boxGapRatio;
    const pillHeight = fontSize + padY * 2;
    const blockHeight = lines.length * pillHeight + (lines.length - 1) * gap;
    const top = textBlockTop(textPosition, height, blockHeight) + jitterY;

    lines.forEach((line, i) => {
      const textWidth = ctx.measureText(line).width;
      const pillWidth = textWidth + padX * 2;
      const pillY = top + i * (pillHeight + gap);
      const pillX = centerX - pillWidth / 2;
      roundRectPath(ctx, pillX, pillY, pillWidth, pillHeight, radius);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.fillText(line, centerX, pillY + pillHeight / 2);
    });
  } else {
    const outline = Math.max(1, fontSize * SLIDE_TEXT_STYLE.outlineWidthRatio);
    const blockHeight = lines.length * lineHeight;
    const top = textBlockTop(textPosition, height, blockHeight) + jitterY;

    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    lines.forEach((line, i) => {
      const y = top + i * lineHeight + lineHeight / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = fontSize * 0.12;
      ctx.lineWidth = outline;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(line, centerX, y);
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, centerX, y);
    });
  }

  const buffer = await canvas.encode("jpeg", 82);
  return { buffer, contentType: "image/jpeg" };
}
