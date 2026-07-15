import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

// Applies to every page by default (Next.js file convention) unless a route
// segment defines its own opengraph-image — used as both the OG image and,
// per Next's documented fallback behavior, the Twitter Card image since no
// separate twitter-image file exists.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs"; // needed for fs access to the local font file

const VOID = "#110f0d";
const BONE = "#f5efe4";
const MUTED = "#948c7e";

// Interlocking-triangle "V" monogram — a chevron stroke (the outer V) with a
// smaller inset triangle woven through the gap at its apex, matching the
// brand mark: two triangular forms interlocking rather than a single glyph.
function Monogram({ color, size: s }: { color: string; size: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: "flex" }}>
      <path
        d="M16 22 L50 76 L84 22"
        fill="none"
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M50 14 L68 40 L32 40 Z" fill={color} />
    </svg>
  );
}

export default async function Image() {
  const clashBold = await readFile(
    path.join(
      process.cwd(),
      "src/assets/fonts/ClashDisplay/Fonts/OTF/ClashDisplay-Bold.otf",
    ),
  );
  const clashMedium = await readFile(
    path.join(
      process.cwd(),
      "src/assets/fonts/ClashDisplay/Fonts/OTF/ClashDisplay-Medium.otf",
    ),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: VOID,
        }}
      >
        {/* Soft warm glow behind the badge, standing in for the reference's
            textured background treatment (Satori can't render photo noise,
            so a radial gradient carries the same "not a flat fill" feel). */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 50% 42%, rgba(255,176,32,0.16) 0%, rgba(17,15,13,0) 46%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 85% 90%, rgba(138,92,246,0.14) 0%, rgba(17,15,13,0) 40%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 176,
              height: 176,
              borderRadius: 40,
              backgroundColor: BONE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Monogram color={VOID} size={96} />
          </div>

          <div
            style={{
              marginTop: 44,
              fontSize: 66,
              fontFamily: "Clash Display Bold",
              color: BONE,
              display: "flex",
              lineHeight: 1,
            }}
          >
            Viral Tiktok
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 26,
              fontFamily: "Clash Display Medium",
              color: MUTED,
              letterSpacing: 10,
              display: "flex",
            }}
          >
            SLIDE SHOWS
          </div>

          <div
            style={{
              marginTop: 48,
              fontSize: 28,
              fontFamily: "Clash Display Medium",
              color: MUTED,
              display: "flex",
              maxWidth: 760,
              textAlign: "center",
              justifyContent: "center",
            }}
          >
            Turn any idea into a viral slideshow — free hook slide instantly
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Clash Display Bold", data: clashBold, weight: 700, style: "normal" },
        { name: "Clash Display Medium", data: clashMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
