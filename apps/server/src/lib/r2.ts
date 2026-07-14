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

export async function uploadToR2(
  bytes: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );

  return `${env.R2_PUBLIC_URL}/${key}`;
}

// Downloads an image from a (possibly ephemeral) source URL and re-uploads
// it to R2, returning the permanent R2 URL. Used right after Ideogram
// generates an image, so the ephemeral link is never the one we persist.
export async function persistImageToR2(sourceUrl: string, key: string): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image for R2 upload (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());

  return uploadToR2(bytes, key, contentType);
}
