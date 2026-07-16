"use client";

import { SLIDE_TEXT_STYLE } from "@/components/generate/slide-text-style";

// Draws the same bold/stroked headline treatment used in the live phone
// preview (SlideshowPhonePreview) directly onto a slide's background image
// at full resolution -- this is what actually gets saved/shared, so the
// file someone posts to TikTok has the text baked in instead of shipping
// a bare background photo. Runs entirely in the browser's own Canvas 2D
// API: no server-side image library involved (a native compositing
// library -- @napi-rs/canvas -- was tried first and crashed on import in
// a completely standard x86_64 Ubuntu sandbox with a bus error, not
// something worth risking in a payment-critical download path when the
// browser already does this reliably).

// Resolves the actual generated font-family string next/font/local
// assigned to --font-clash-display (a hashed name, not literally "Clash
// Display") so canvas text uses the same typeface as the rest of the UI
// instead of silently falling back to a system font.
function resolveDisplayFontFamily(): string {
  if (typeof document === "undefined") return "sans-serif";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-clash-display")
    .trim();
  return value ? `${value}, sans-serif` : "sans-serif";
}

// Greedy word-wrap against the canvas's own text measurement -- the same
// approach any plain-text editor uses, just driven by ctx.measureText
// instead of DOM layout.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode this slide's image"));
    };
    img.src = objectUrl;
  });
}

export async function composeSlideImage(backgroundBlob: Blob, text: string): Promise<Blob> {
  const img = await loadImage(backgroundBlob);

  // Canvas text needs the font already loaded to measure/draw correctly --
  // unlike DOM text, there's no automatic reflow once a webfont finishes
  // loading after the fact.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const fontFamily = resolveDisplayFontFamily();
  const fontSize = Math.round(canvas.width * SLIDE_TEXT_STYLE.fontSizeRatio);
  const lineHeight = fontSize * SLIDE_TEXT_STYLE.lineHeightRatio;
  const maxWidth = canvas.width * SLIDE_TEXT_STYLE.maxWidthRatio;
  const strokeWidth = fontSize * SLIDE_TEXT_STYLE.strokeWidthRatio;
  const top = canvas.height * SLIDE_TEXT_STYLE.topOffsetRatio;

  ctx.font = `${SLIDE_TEXT_STYLE.fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const lines = wrapLines(ctx, text, maxWidth);
  const centerX = canvas.width / 2;

  for (const [i, line] of lines.entries()) {
    const y = top + fontSize + i * lineHeight;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = "black";
    ctx.strokeText(line, centerX, y);
    ctx.fillStyle = "white";
    ctx.fillText(line, centerX, y);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export this slide's image"));
    }, "image/png");
  });
}
