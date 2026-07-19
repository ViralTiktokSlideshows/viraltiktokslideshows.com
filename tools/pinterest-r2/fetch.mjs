/*
Bulk-fetch Pinterest images straight into Cloudflare R2. Never writes images to disk.
Standalone — no monorepo needed. See README.md for the full VPS walkthrough.

  npm install
  DRY_RUN=1 node --env-file=.env fetch.mjs   # test: scrape + log, no upload
  node --env-file=.env fetch.mjs             # real run

Requires: Node 20+, and pinterest-dl on PATH (pip install "pinterest-dl[image]").
.env must define: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, R2_PUBLIC_URL.

Tuning via env: PER_QUERY (default 100), CONCURRENCY (default 8),
QUERY_DELAY_MS (default 4000), DRY_RUN=1.
Progress is saved to .pinterest-progress.json so re-runs resume and dedupe.
*/

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PutObjectCommand, S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(HERE, ".pinterest-progress.json");

const PER_QUERY = Number(process.env.PER_QUERY ?? 100);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const QUERY_DELAY_MS = Number(process.env.QUERY_DELAY_MS ?? 4000);
const DRY_RUN = process.env.DRY_RUN === "1";

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const QUERIES = [
  { niche: "gym", query: "dark aesthetic gym" },
  { niche: "gym", query: "moody gym lighting" },
  { niche: "gym", query: "barbell close up" },
  { niche: "gym", query: "running at sunrise" },
  { niche: "gym", query: "gym mirror aesthetic" },
  { niche: "study", query: "aesthetic study desk" },
  { niche: "study", query: "cozy library" },
  { niche: "study", query: "late night study lamp" },
  { niche: "study", query: "handwritten notes aesthetic" },
  { niche: "study", query: "coffee and books" },
  { niche: "motivation", query: "moody city night" },
  { niche: "motivation", query: "empty road sunrise" },
  { niche: "motivation", query: "mountain summit fog" },
  { niche: "motivation", query: "rain window aesthetic" },
  { niche: "motivation", query: "lone figure silhouette" },
  { niche: "books", query: "stack of books aesthetic" },
  { niche: "books", query: "cozy reading nook" },
  { niche: "books", query: "open book candle" },
  { niche: "books", query: "bookshelf warm light" },
  { niche: "selfimprovement", query: "morning routine aesthetic" },
  { niche: "selfimprovement", query: "journaling flatlay" },
  { niche: "selfimprovement", query: "minimal desk setup" },
  { niche: "selfimprovement", query: "sunrise window light" },
];

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: {}, hashes: [] };
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return { done: {}, hashes: [] };
  }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function upgradeResolution(url) {
  return url.replace(/\/\d+x\d*\//, "/originals/").replace(/\/\d+x\//, "/originals/");
}

function looksLikeImage(url) {
  return /^https?:\/\/i\.pinimg\.com\//.test(url) || /\.(jpe?g|png|webp)(\?|$)/i.test(url);
}

function collectUrls(node, out) {
  if (!node) return;
  if (typeof node === "string") {
    if (looksLikeImage(node)) out.add(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectUrls(v, out);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node)) collectUrls(v, out);
  }
}

function scrapeQuery(query, count) {
  return new Promise((resolve) => {
    const args = ["search", query, "-n", String(count), "--json"];
    const child = spawn("pinterest-dl", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      console.error(`  ! pinterest-dl failed to launch: ${err.message}`);
      resolve([]);
    });
    child.on("close", () => {
      const urls = new Set();
      try {
        const objStart = stdout.indexOf("{");
        const arrStart = stdout.indexOf("[");
        const jsonStart =
          arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;
        if (jsonStart !== -1) collectUrls(JSON.parse(stdout.slice(jsonStart)), urls);
      } catch (e) {
        console.error(`  ! could not parse pinterest-dl output: ${e.message}`);
        if (stderr) console.error(`    stderr: ${stderr.slice(0, 200)}`);
      }
      resolve([...urls].map(upgradeResolution));
    });
  });
}

async function maybeReencode(bytes) {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(bytes), { failOn: "none" })
      .resize({ width: 1080, height: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return bytes;
  }
}

async function alreadyInBucket(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function fetchAndUpload(url, niche, querySlug, seen) {
  let res;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
  } catch {
    return "error";
  }
  if (!res.ok) return "error";

  let bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 8000) return "skip";

  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  if (seen.has(hash)) return "dupe";
  seen.add(hash);

  bytes = await maybeReencode(bytes);
  const key = `library/${niche}/${querySlug}/${hash}.jpg`;

  if (DRY_RUN) {
    console.log(`    would upload ${key} (${(bytes.byteLength / 1024).toFixed(0)}kb)`);
    return "ok";
  }

  if (await alreadyInBucket(key)) return "dupe";

  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: "image/jpeg" }),
  );
  return "ok";
}

async function runPool(items, worker) {
  let i = 0;
  const tally = { ok: 0, dupe: 0, skip: 0, error: 0 };
  async function next() {
    while (i < items.length) {
      const idx = i++;
      const r = await worker(items[idx]);
      tally[r] = (tally[r] ?? 0) + 1;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, next));
  return tally;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!BUCKET || !PUBLIC_URL || !process.env.R2_ACCOUNT_ID) {
    console.error("Missing R2 env. Run with: node --env-file=.env fetch.mjs");
    process.exit(1);
  }

  const progress = loadProgress();
  const seen = new Set(progress.hashes);
  let grandTotal = 0;

  for (const { niche, query } of QUERIES) {
    const querySlug = slug(query);
    const doneKey = `${niche}/${querySlug}`;
    if (progress.done[doneKey]) {
      console.log(`= skip (done): ${doneKey}`);
      continue;
    }

    console.log(`\n> ${niche} / "${query}"`);
    const urls = await scrapeQuery(query, PER_QUERY);
    console.log(`  scraped ${urls.length} urls`);

    const tally = await runPool(urls, (url) => fetchAndUpload(url, niche, querySlug, seen));
    console.log(`  uploaded=${tally.ok} dupe=${tally.dupe} skip=${tally.skip} err=${tally.error}`);

    grandTotal += tally.ok;
    progress.done[doneKey] = tally.ok;
    progress.hashes = [...seen];
    saveProgress(progress);

    await sleep(QUERY_DELAY_MS);
  }

  console.log(`\nDone. New images uploaded this run: ${grandTotal}`);
  console.log(`Total unique images tracked: ${seen.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
