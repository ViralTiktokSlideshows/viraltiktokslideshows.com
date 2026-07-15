import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@viraltiktokslideshows/env/server";

// Cloudflare R2 — S3-compatible object storage used to persist images we
// generate. Right now that's just Ideogram slide images, whose returned
// URLs are explicitly ephemeral (Ideogram's docs: "if you would like to
// keep the image, you must download it"). Anything else the app generates
// and needs to survive past the request that created it should land here
// too — there's currently nothing else that qualifies.
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

// Neither the source-image fetch nor the R2 upload had a timeout -- unlike
// every other external call in this app (ideogram.ts's own 45s, openrouter.ts's
// own timeout). A slow/hanging Ideogram image URL or a stuck R2 request
// left generateSlideImages's Promise.allSettled waiting forever on that one
// slide, which blocks the *entire* batch (allSettled only resolves once
// every promise has), which blocks fillRemainingSlideImages, which blocks
// POST /api/checkout/create -- with no error, just an unlock button that
// spins indefinitely. Same 30s budget for both steps here.
const REQUEST_TIMEOUT_MS = 30_000;

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

// Downloads an image from a (possibly ephemeral) source URL and re-uploads
// it to R2, returning the permanent R2 URL. Used right after Ideogram
// generates an image, so the ephemeral link is never the one we persist.
export async function persistImageToR2(sourceUrl: string, key: string): Promise<string> {
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

  const contentType = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());

  return uploadToR2(bytes, key, contentType);
}
