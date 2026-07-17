import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@viraltiktokslideshows/env/server";

// Cloudflare R2 — S3-compatible object storage used to persist the slide
// images we source (Ideogram AI images, Pexels stock photos), whose
// original URLs are ephemeral (Ideogram) or third-party (Pexels). Every
// image is copied here so the URL we store and serve is permanent and on
// our own domain.
//
// R2 has no separate "region" concept; "auto" plus the account-scoped
// endpoint is the documented way to point the AWS SDK at it.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const REQUEST_TIMEOUT_MS = 30_000;

// TikTok's native canvas is 1080x1920. Ideogram returns ~1440x2560 PNGs
// (several MB) which are pointlessly large for that and murder preview load
// on slow networks -- so paid Ideogram images are downscaled to fit 1080x1920
// and re-encoded as JPEG before they're stored. Pexels images are requested
// pre-sized/compressed from Pexels itself (see stock-photos.ts) and don't go
// through this.
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 78;

export async function uploadToR2(
  bytes: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
      { abortSignal: controller.signal },
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`R2 upload timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  return `${env.R2_PUBLIC_URL}/${key}`;
}

// Downscales to fit 1080x1920 and re-encodes as JPEG using sharp (libvips --
// fast, threaded). Tuned for speed over maximum compression: the default
// (non-mozjpeg) encoder and no EXIF-rotate step (Ideogram PNGs carry no
// orientation metadata). sharp is loaded lazily and any failure -- including
// sharp not being installed/loadable in this runtime -- is swallowed so the
// original image is stored instead. That means the worst case is a larger
// image, never a broken generation or a crash on a payment path (unlike a
// top-level native import, which is exactly how @napi-rs/canvas took the
// process down earlier).
async function reencodeToJpeg(
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(bytes), { failOn: "none" })
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { bytes: new Uint8Array(out), contentType: "image/jpeg" };
  } catch (err) {
    console.error("[r2] image re-encode skipped (sharp unavailable or failed); storing original", err);
    return null;
  }
}

// Downloads an image from a (possibly ephemeral) source URL and re-uploads
// it to R2, returning the permanent R2 URL. `keyBase` is the object key
// WITHOUT an extension -- the extension is chosen from the final content
// type so a re-encoded image lands as .jpg and a passthrough PNG as .png.
// Pass { reencode: true } for large source images (Ideogram) that should be
// shrunk to TikTok size; leave it off for already-small sources (Pexels).
export async function persistImageToR2(
  sourceUrl: string,
  keyBase: string,
  options: { reencode?: boolean } = {},
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(sourceUrl, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timed out fetching source image for R2 upload after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch source image for R2 upload (${res.status})`);
  }

  let contentType = res.headers.get("content-type") || "image/png";
  let bytes = new Uint8Array(await res.arrayBuffer());

  if (options.reencode) {
    const processed = await reencodeToJpeg(bytes);
    if (processed) {
      bytes = processed.bytes;
      contentType = processed.contentType;
    }
  }

  const ext =
    contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "img";

  return uploadToR2(bytes, `${keyBase}.${ext}`, contentType);
}
