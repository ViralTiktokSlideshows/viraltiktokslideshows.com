"use client";

import {
  SLIDE_TEXT_STYLE,
  naturalJitter,
  textBlockTop,
  type SlideTextPosition,
  type SlideTextStyle,
} from "@/components/generate/slide-text-style";

// Bakes the slide's overlay text onto its background image at full
// resolution, in the same two TikTok treatments the live preview uses
// (see slide-text-style.ts): "boxed" = black text in per-line white pills,
// "outlined" = white text with a dark outline. Runs entirely in the
// browser's Canvas 2D API -- no server-side/native image library.

function resolveSlideFontFamily(): string {
  if (typeof document === "undefined") return "sans-serif";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-inter")
    .trim();
  return value ? `${value}, sans-serif` : "sans-serif";
}

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

function roundRectPath(
  ctx: CanvasRenderingContext2D,
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

const IMAGE_LOAD_TIMEOUT_MS = 15_000;
const FONTS_READY_TIMEOUT_MS = 5_000;

type DecodedImage = { source: CanvasImageSource; width: number; height: number };

// Decodes an image blob into something canvas can draw. Prefers
// createImageBitmap: it decodes the blob directly and resolves/rejects a
// real promise, unlike `new Image()` + onload -- whose load event was
// observed to NEVER fire for some blobs in the field, hanging the whole
// download until the 15s timeout and forcing a text-less fallback. Falls
// back to the <img> approach only where createImageBitmap is unavailable.
async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const el = new window.Image();
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Timed out decoding this slide's image"));
    }, IMAGE_LOAD_TIMEOUT_MS);
    el.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(el);
    };
    el.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode this slide's image"));
    };
    el.src = objectUrl;
  });
  return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

export async function composeSlideImage(
  backgroundBlob: Blob,
  text: string,
  textPosition: SlideTextPosition = "top",
  textStyle: SlideTextStyle = "boxed",
): Promise<Blob> {
  const decoded = await decodeImage(backgroundBlob);

  // Canvas text needs the font already loaded to measure/draw correctly.
  // document.fonts.ready has been known to never resolve in some webviews,
  // so it's raced against a short timeout -- worst case the text draws in a
  // fallback sans-serif instead of hanging.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, FONTS_READY_TIMEOUT_MS)),
    ]);
  }

  const canvas = document.createElement("canvas");
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");

  ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  if ("close" in decoded.source && typeof decoded.source.close === "function") {
    decoded.source.close();
  }

  const fontFamily = resolveSlideFontFamily();
  const fontSize = Math.round(canvas.width * SLIDE_TEXT_STYLE.fontSizeRatio);
  const lineHeight = fontSize * SLIDE_TEXT_STYLE.lineHeightRatio;
  const maxWidth = canvas.width * SLIDE_TEXT_STYLE.maxWidthRatio;

  ctx.font = `${SLIDE_TEXT_STYLE.fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapLines(ctx, text, maxWidth);
  const jitter = naturalJitter(text);
  const centerX = canvas.width / 2 + jitter.xRatio * canvas.width;
  const jitterY = jitter.yRatio * canvas.height;

  if (textStyle === "boxed") {
    const padX = fontSize * SLIDE_TEXT_STYLE.boxPadXRatio;
    const padY = fontSize * SLIDE_TEXT_STYLE.boxPadYRatio;
    const radius = fontSize * SLIDE_TEXT_STYLE.boxRadiusRatio;
    const gap = fontSize * SLIDE_TEXT_STYLE.boxGapRatio;
    const pillHeight = fontSize + padY * 2;
    const blockHeight = lines.length * pillHeight + (lines.length - 1) * gap;
    const top = textBlockTop(textPosition, canvas.height, blockHeight) + jitterY;

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
    const top = textBlockTop(textPosition, canvas.height, blockHeight) + jitterY;

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

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export this slide's image"));
    }, "image/png");
  });
}
