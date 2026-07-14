import { ImageResponse } from "next/og";

// Applies to every page by default (Next.js file convention) unless a route
// segment defines its own opengraph-image — used as both the OG image and,
// per Next's documented fallback behavior, the Twitter Card image since no
// separate twitter-image file exists.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#110f0d",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: "#110f0d",
              border: "2px solid #ffb020",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 24,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                backgroundColor: "#ffb020",
                transform: "rotate(45deg)",
              }}
            />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#f5efe4", display: "flex" }}>
            viraltiktokslideshows
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#f5efe4",
            display: "flex",
            maxWidth: 980,
          }}
        >
          Turn any idea into a viral slideshow
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#948c7e",
            display: "flex",
            maxWidth: 880,
          }}
        >
          Free hook slide instantly. Unlock the full deck for $2.
        </div>
      </div>
    ),
    { ...size },
  );
}
