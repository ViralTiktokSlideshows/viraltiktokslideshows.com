"use client";

import { Bookmark, ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import {
  justifyForPosition,
  naturalJitter,
  type SlideTextPosition,
  type SlideTextStyle,
} from "./slide-text-style";

export type PreviewSlide = {
  index: number;
  text: string;
  imageUrl?: string;
  textPosition?: SlideTextPosition;
  textStyle?: SlideTextStyle;
};

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]";

// The "pay special attention to this" piece: a phone-framed preview of the
// real unlocked slides (no placeholder copy — slides come straight from
// the Purchase row) that the user can swipe, drag, or use the arrow
// buttons/keyboard to move through.
export function SlideshowPhonePreview({ slides }: { slides: PreviewSlide[] }) {
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  // Every image here is already a permanent R2 URL, so there's no reason
  // to fetch each one on-demand as someone clicks/swipes to it. The <img>
  // below just updates its `src` attribute on navigation -- browsers keep
  // painting whatever the previously-loaded image was until the new,
  // multi-MB full-res one finishes downloading, which on a slow connection
  // reads as "stuck on slide 1, only 2 images ever show up" for several
  // clicks in a row, then jumps once a fetch finally lands. Kicking off
  // every slide's fetch as soon as the real URLs are known means most are
  // already in the browser's cache well before someone reaches them.
  const imageUrlsKey = useMemo(
    () => slides.map((s) => s.imageUrl ?? "").join("|"),
    [slides],
  );
  useEffect(() => {
    const urls = imageUrlsKey.split("|").filter(Boolean);
    const preloaded = urls.map((url) => {
      const img = new window.Image();
      img.src = url;
      return img;
    });
    return () => {
      // Drop the references so an in-flight fetch for a preview that's no
      // longer on screen doesn't keep holding onto memory.
      preloaded.length = 0;
    };
  }, [imageUrlsKey]);

  function goTo(index: number) {
    setActive(Math.max(0, Math.min(slides.length - 1, index)));
  }

  function handlePointerDown(event: React.PointerEvent) {
    startX.current = event.clientX;
    dragging.current = true;
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragging.current || startX.current === null) return;
    setDragX(event.clientX - startX.current);
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX < -50) goTo(active + 1);
    else if (dragX > 50) goTo(active - 1);
    setDragX(0);
    startX.current = null;
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") goTo(active + 1);
    if (event.key === "ArrowLeft") goTo(active - 1);
  }

  const slide = slides[active];

  return (
    <div className="mx-auto w-full max-w-[240px]">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`Slide ${active + 1} of ${slides.length}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={cn(
          "relative aspect-9/16 w-full touch-pan-y overflow-hidden rounded-[28px] border-4 border-void shadow-xl outline-none select-none",
          STRIPES,
        )}
        style={{
          transform: `translateX(${dragX * 0.15}px)`,
          transition: dragging.current ? "none" : "transform 200ms ease-out",
        }}
      >
        {slide?.imageUrl ? (
          // Plain <img>, not next/image — these are ephemeral third-party
          // Ideogram URLs, not worth adding to next.config's image domain
          // allowlist for.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : null}

        <span className="absolute top-3 left-3 rounded-2xl bg-void/70 px-2 py-0.5 text-[10px] font-semibold text-bone">
          {active + 1} / {slides.length}
        </span>

        {/* Two real-TikTok text treatments, matched to reference slideshows
            (see slide-text-style.ts): "boxed" draws black text inside
            per-line white pills (box-decoration-break: clone gives each
            wrapped line its own rounded background, exactly like TikTok's
            caption sticker); "outlined" draws bold white text with a thin
            dark outline. Each slide also places its text top/center/bottom
            where its photo left room. The canvas export
            (compose-slide-image.ts) mirrors both styles so the downloaded
            image matches this preview. */}
        <div
          className="absolute inset-x-[9%] inset-y-[14%] flex flex-col text-center"
          style={{
            justifyContent: justifyForPosition(slide?.textPosition ?? "top"),
            transform: `translate(${naturalJitter(slide?.text ?? "").xRatio * 100}%, ${
              naturalJitter(slide?.text ?? "").yRatio * 100
            }%)`,
          }}
        >
          {(slide?.textStyle ?? "boxed") === "boxed" ? (
            <p className="font-display text-[15px] leading-[1.5] font-bold">
              <span
                className="box-decoration-clone rounded-[5px] bg-white px-[0.3em] py-[0.06em] text-[#111]"
                style={{ WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}
              >
                {slide?.text}
              </span>
            </p>
          ) : (
            <p
              className="font-display text-[16px] leading-[1.35] font-bold text-white"
              style={{
                textShadow:
                  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.5)",
              }}
            >
              {slide?.text}
            </p>
          )}
        </div>

        <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 flex-col items-center gap-4">
          <button type="button" aria-label="Like" className="text-white/90 transition-colors hover:text-white">
            <Heart className="size-5 drop-shadow" />
          </button>
          <button type="button" aria-label="Save" className="text-white/90 transition-colors hover:text-white">
            <Bookmark className="size-5 drop-shadow" />
          </button>
          <button type="button" aria-label="Share" className="text-white/90 transition-colors hover:text-white">
            <Share2 className="size-5 drop-shadow" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="rounded-2xl border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-1">
          {slides.map((s, i) => (
            <span
              key={s.index}
              className={cn(
                "h-1.5 rounded-2xl transition-all duration-200",
                i === active ? "w-4 bg-spark" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next slide"
          onClick={() => goTo(active + 1)}
          disabled={active === slides.length - 1}
          className="rounded-2xl border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Swipe to preview all {slides.length} slides
      </p>
    </div>
  );
}
