/*
Bulk-fetch Pinterest images straight into Cloudflare R2. Never writes images to disk.
Standalone — no monorepo needed. See README.md for the full VPS walkthrough.

  npm install
  DRY_RUN=1 node --env-file=.env fetch.mjs   # test: scrape + log, no upload
  node --env-file=.env fetch.mjs             # real run

Requires: Node 20+, and pinterest-dl on PATH (pip install pinterest-dl).
.env must define: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, R2_PUBLIC_URL.

Memory: peak RAM is bounded by CONCURRENCY (how many images are in flight at
once), NOT by the total. 50k vs 2k has the same footprint. sharp runs single-
threaded with its cache off, oversized source images are skipped, and nothing is
ever held in an array of image bytes. Only tiny hash strings accumulate.

Tuning via env: PER_QUERY (150), CONCURRENCY (6), QUERY_DELAY_MS (3000),
MAX_TOTAL (50000 — stops once this many unique images are banked),
MAX_SOURCE_BYTES (6000000), DRY_RUN=1.
Progress is saved to .pinterest-progress.json so re-runs resume and dedupe.
*/

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(HERE, ".pinterest-progress.json");

const PER_QUERY = Number(process.env.PER_QUERY ?? 150);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 6);
const QUERY_DELAY_MS = Number(process.env.QUERY_DELAY_MS ?? 3000);
const MAX_TOTAL = Number(process.env.MAX_TOTAL ?? 50000);
const MAX_SOURCE_BYTES = Number(process.env.MAX_SOURCE_BYTES ?? 6_000_000);
const MIN_SOURCE_BYTES = 8000;
const DRY_RUN = process.env.DRY_RUN === "1";

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const QUERIES = [
  { niche: "gym", query: "dark aesthetic gym" },
  { niche: "gym", query: "moody gym lighting" },
  { niche: "gym", query: "barbell close up" },
  { niche: "gym", query: "gym mirror aesthetic" },
  { niche: "gym", query: "dumbbells rack" },
  { niche: "gym", query: "empty gym morning" },
  { niche: "gym", query: "weightlifting chalk hands" },
  { niche: "gym", query: "home gym setup" },
  { niche: "gym", query: "athlete silhouette" },
  { niche: "gym", query: "boxing gym dark" },
  { niche: "gym", query: "kettlebell workout" },
  { niche: "gym", query: "gym neon lights" },
  { niche: "gym", query: "squat rack" },
  { niche: "gym", query: "sweat workout closeup" },
  { niche: "gym", query: "outdoor calisthenics" },
  { niche: "gym", query: "muscular back workout" },
  { niche: "gym", query: "gym towel water bottle" },
  { niche: "gym", query: "fitness aesthetic dark" },

  { niche: "running", query: "running at sunrise" },
  { niche: "running", query: "trail running forest" },
  { niche: "running", query: "runner city street" },
  { niche: "running", query: "running shoes closeup" },
  { niche: "running", query: "morning jog fog" },
  { niche: "running", query: "track running lane" },
  { niche: "running", query: "runner silhouette sunset" },
  { niche: "running", query: "mountain trail run" },
  { niche: "running", query: "running on beach" },
  { niche: "running", query: "running in rain" },
  { niche: "running", query: "road cycling" },
  { niche: "running", query: "hiking trail sunrise" },
  { niche: "running", query: "stairs workout" },
  { niche: "running", query: "marathon crowd" },
  { niche: "running", query: "sprinter starting block" },

  { niche: "study", query: "aesthetic study desk" },
  { niche: "study", query: "cozy library" },
  { niche: "study", query: "late night study lamp" },
  { niche: "study", query: "handwritten notes aesthetic" },
  { niche: "study", query: "coffee and books" },
  { niche: "study", query: "study with rain" },
  { niche: "study", query: "open notebook pen" },
  { niche: "study", query: "laptop study cafe" },
  { niche: "study", query: "library bookshelves" },
  { niche: "study", query: "desk plant notebook" },
  { niche: "study", query: "morning study routine" },
  { niche: "study", query: "exam prep desk" },
  { niche: "study", query: "minimal study setup" },
  { niche: "study", query: "highlighters notes" },
  { niche: "study", query: "candle study night" },
  { niche: "study", query: "university campus autumn" },
  { niche: "study", query: "focused writing hand" },
  { niche: "study", query: "tea and studying" },

  { niche: "books", query: "stack of books aesthetic" },
  { niche: "books", query: "cozy reading nook" },
  { niche: "books", query: "open book candle" },
  { niche: "books", query: "bookshelf warm light" },
  { niche: "books", query: "reading in bed" },
  { niche: "books", query: "old bookstore" },
  { niche: "books", query: "book and coffee" },
  { niche: "books", query: "reading by window rain" },
  { niche: "books", query: "vintage books" },
  { niche: "books", query: "library ladder shelves" },
  { niche: "books", query: "book flatlay" },
  { niche: "books", query: "reading in nature" },
  { niche: "books", query: "book cafe aesthetic" },
  { niche: "books", query: "novel and blanket" },
  { niche: "books", query: "fantasy books aesthetic" },
  { niche: "books", query: "poetry book flowers" },

  { niche: "motivation", query: "moody city night" },
  { niche: "motivation", query: "empty road sunrise" },
  { niche: "motivation", query: "mountain summit fog" },
  { niche: "motivation", query: "rain window aesthetic" },
  { niche: "motivation", query: "lone figure silhouette" },
  { niche: "motivation", query: "stormy ocean cliff" },
  { niche: "motivation", query: "climbing mountain peak" },
  { niche: "motivation", query: "foggy forest path" },
  { niche: "motivation", query: "desert road horizon" },
  { niche: "motivation", query: "winding mountain road" },
  { niche: "motivation", query: "dark clouds sky" },
  { niche: "motivation", query: "person on mountain top" },
  { niche: "motivation", query: "waves crashing rocks" },
  { niche: "motivation", query: "snowy mountain peak" },
  { niche: "motivation", query: "dramatic sky sunset" },
  { niche: "motivation", query: "endless highway" },
  { niche: "motivation", query: "hiker overlooking valley" },
  { niche: "motivation", query: "lighthouse storm" },

  { niche: "discipline", query: "5am morning dark" },
  { niche: "discipline", query: "cold shower" },
  { niche: "discipline", query: "gym before sunrise" },
  { niche: "discipline", query: "hard work aesthetic" },
  { niche: "discipline", query: "athlete training alone" },
  { niche: "discipline", query: "writing goals notebook" },
  { niche: "discipline", query: "dark aesthetic focus" },
  { niche: "discipline", query: "training in rain" },
  { niche: "discipline", query: "boxing training dark" },
  { niche: "discipline", query: "early morning run dark" },
  { niche: "discipline", query: "sweat and grind" },
  { niche: "discipline", query: "monk mode aesthetic" },

  { niche: "selfimprovement", query: "morning routine aesthetic" },
  { niche: "selfimprovement", query: "journaling flatlay" },
  { niche: "selfimprovement", query: "minimal desk setup" },
  { niche: "selfimprovement", query: "sunrise window light" },
  { niche: "selfimprovement", query: "meditation sunrise" },
  { niche: "selfimprovement", query: "yoga at home" },
  { niche: "selfimprovement", query: "cup of coffee morning" },
  { niche: "selfimprovement", query: "planner and pen" },
  { niche: "selfimprovement", query: "reading self help book" },
  { niche: "selfimprovement", query: "walking in nature" },
  { niche: "selfimprovement", query: "gratitude journal" },
  { niche: "selfimprovement", query: "clean minimal room" },
  { niche: "selfimprovement", query: "candle and journal" },
  { niche: "selfimprovement", query: "vision board" },
  { niche: "selfimprovement", query: "healthy breakfast bowl" },
  { niche: "selfimprovement", query: "quiet morning coffee" },
  { niche: "selfimprovement", query: "morning stretch" },
  { niche: "selfimprovement", query: "notebook and plant" },

  { niche: "money", query: "stacks of cash" },
  { niche: "money", query: "luxury car night" },
  { niche: "money", query: "modern mansion" },
  { niche: "money", query: "rolex watch closeup" },
  { niche: "money", query: "private jet interior" },
  { niche: "money", query: "city skyline penthouse" },
  { niche: "money", query: "gold bars" },
  { niche: "money", query: "luxury lifestyle aesthetic" },
  { niche: "money", query: "sports car garage" },
  { niche: "money", query: "money and laptop" },
  { niche: "money", query: "yacht ocean" },
  { niche: "money", query: "expensive watch wrist" },
  { niche: "money", query: "downtown skyscrapers" },
  { niche: "money", query: "luxury hotel lobby" },
  { niche: "money", query: "first class flight" },
  { niche: "money", query: "wealth aesthetic dark" },

  { niche: "business", query: "laptop coffee workspace" },
  { niche: "business", query: "modern office desk" },
  { niche: "business", query: "startup whiteboard" },
  { niche: "business", query: "city business district" },
  { niche: "business", query: "notebook business plan" },
  { niche: "business", query: "coworking space" },
  { niche: "business", query: "man in suit city" },
  { niche: "business", query: "meeting conference room" },
  { niche: "business", query: "desk with laptop plant" },
  { niche: "business", query: "entrepreneur working late" },
  { niche: "business", query: "minimal workspace" },
  { niche: "business", query: "skyscraper looking up" },
  { niche: "business", query: "business woman city" },
  { niche: "business", query: "office window view" },
  { niche: "business", query: "working on laptop cafe" },
  { niche: "business", query: "productivity desk setup" },

  { niche: "mindset", query: "greek statue aesthetic" },
  { niche: "mindset", query: "marble statue dark" },
  { niche: "mindset", query: "roman column ruins" },
  { niche: "mindset", query: "stoic statue shadow" },
  { niche: "mindset", query: "dark academia statue" },
  { niche: "mindset", query: "bust sculpture" },
  { niche: "mindset", query: "temple columns" },
  { niche: "mindset", query: "chess board closeup" },
  { niche: "mindset", query: "ocean cliff calm" },
  { niche: "mindset", query: "candle dark room" },
  { niche: "mindset", query: "old map compass" },
  { niche: "mindset", query: "fireplace reading" },
  { niche: "mindset", query: "quiet lake reflection" },
  { niche: "mindset", query: "ancient philosophy book" },

  { niche: "productivity", query: "coffee desk laptop" },
  { niche: "productivity", query: "person writing focused" },
  { niche: "productivity", query: "quiet office morning" },
  { niche: "productivity", query: "to do list notebook" },
  { niche: "productivity", query: "clean desk setup" },
  { niche: "productivity", query: "focused work laptop" },
  { niche: "productivity", query: "minimal workspace plant" },
  { niche: "productivity", query: "morning coffee laptop" },
  { niche: "productivity", query: "desk lamp night work" },
  { niche: "productivity", query: "planner weekly spread" },
  { niche: "productivity", query: "laptop cafe window" },
  { niche: "productivity", query: "organized desk aesthetic" },

  { niche: "relationships", query: "couple holding hands sunset" },
  { niche: "relationships", query: "couple silhouette beach" },
  { niche: "relationships", query: "romantic dinner candles" },
  { niche: "relationships", query: "couple walking city" },
  { niche: "relationships", query: "holding hands closeup" },
  { niche: "relationships", query: "couple in nature" },
  { niche: "relationships", query: "couple coffee date" },
  { niche: "relationships", query: "sunset couple hug" },
  { niche: "relationships", query: "flowers bouquet romantic" },
  { niche: "relationships", query: "couple rain umbrella" },
  { niche: "relationships", query: "date night city lights" },
  { niche: "relationships", query: "picnic sunset couple" },

  { niche: "faith", query: "open bible sunrise" },
  { niche: "faith", query: "church interior light" },
  { niche: "faith", query: "cross on hill sunset" },
  { niche: "faith", query: "praying hands light" },
  { niche: "faith", query: "bible and coffee" },
  { niche: "faith", query: "cathedral stained glass" },
  { niche: "faith", query: "candle church prayer" },
  { niche: "faith", query: "worship hands raised" },
  { niche: "faith", query: "old church countryside" },
  { niche: "faith", query: "bible journaling" },
  { niche: "faith", query: "light through church window" },
  { niche: "faith", query: "peaceful chapel" },

  { niche: "travel", query: "mountain road trip" },
  { niche: "travel", query: "van life sunset" },
  { niche: "travel", query: "backpacker mountain view" },
  { niche: "travel", query: "airplane window clouds" },
  { niche: "travel", query: "tropical beach aerial" },
  { niche: "travel", query: "campfire night stars" },
  { niche: "travel", query: "tent mountain view" },
  { niche: "travel", query: "passport and map" },
  { niche: "travel", query: "waterfall jungle" },
  { niche: "travel", query: "santorini white houses" },
  { niche: "travel", query: "northern lights" },
  { niche: "travel", query: "camping lake sunrise" },
  { niche: "travel", query: "cliff overlooking ocean" },
  { niche: "travel", query: "hot air balloon sunrise" },
  { niche: "travel", query: "snowy cabin woods" },
  { niche: "travel", query: "road trip desert" },

  { niche: "nature", query: "misty forest morning" },
  { niche: "nature", query: "ocean waves aerial" },
  { niche: "nature", query: "autumn forest path" },
  { niche: "nature", query: "snowy mountain range" },
  { niche: "nature", query: "desert dunes sunset" },
  { niche: "nature", query: "waterfall long exposure" },
  { niche: "nature", query: "lavender field sunset" },
  { niche: "nature", query: "starry night sky" },
  { niche: "nature", query: "green rolling hills" },
  { niche: "nature", query: "calm lake reflection" },
  { niche: "nature", query: "pine forest fog" },
  { niche: "nature", query: "beach golden hour" },
  { niche: "nature", query: "canyon red rocks" },
  { niche: "nature", query: "flower field spring" },

  { niche: "city", query: "tokyo street night" },
  { niche: "city", query: "neon city rain" },
  { niche: "city", query: "new york skyline night" },
  { niche: "city", query: "empty subway station" },
  { niche: "city", query: "city street aerial" },
  { niche: "city", query: "rainy street reflection" },
  { niche: "city", query: "urban alley graffiti" },
  { niche: "city", query: "city lights bokeh" },
  { niche: "city", query: "rooftop city view" },
  { niche: "city", query: "night city traffic lights" },
  { niche: "city", query: "london street rain" },
  { niche: "city", query: "street food night market" },

  { niche: "food", query: "latte art closeup" },
  { niche: "food", query: "coffee shop aesthetic" },
  { niche: "food", query: "breakfast flatlay" },
  { niche: "food", query: "matcha latte" },
  { niche: "food", query: "avocado toast" },
  { niche: "food", query: "coffee beans closeup" },
  { niche: "food", query: "cozy cafe window" },
  { niche: "food", query: "espresso cup" },
  { niche: "food", query: "smoothie bowl" },
  { niche: "food", query: "brunch table spread" },
  { niche: "food", query: "croissant coffee" },
  { niche: "food", query: "iced coffee summer" },

  { niche: "calm", query: "calm ocean horizon" },
  { niche: "calm", query: "meditation candle" },
  { niche: "calm", query: "misty lake morning" },
  { niche: "calm", query: "sunlight through trees" },
  { niche: "calm", query: "hammock beach relax" },
  { niche: "calm", query: "bath aesthetic candles" },
  { niche: "calm", query: "quiet reading corner" },
  { niche: "calm", query: "rain on window calm" },
  { niche: "calm", query: "sunset field peace" },
  { niche: "calm", query: "cozy blanket tea" },
  { niche: "calm", query: "walking forest path" },
  { niche: "calm", query: "zen garden stones" },

  { niche: "fashion", query: "streetwear outfit aesthetic" },
  { niche: "fashion", query: "minimal fashion flatlay" },
  { niche: "fashion", query: "sneakers closeup" },
  { niche: "fashion", query: "clothing rack aesthetic" },
  { niche: "fashion", query: "autumn outfit street" },
  { niche: "fashion", query: "handbag flatlay" },
  { niche: "fashion", query: "sunglasses aesthetic" },
  { niche: "fashion", query: "boots street style" },
  { niche: "fashion", query: "monochrome outfit" },
  { niche: "fashion", query: "accessories flatlay" },
  { niche: "fashion", query: "trench coat city" },
  { niche: "fashion", query: "watch and outfit" },

  { niche: "cars", query: "sports car night city" },
  { niche: "cars", query: "classic car sunset" },
  { niche: "cars", query: "car interior luxury" },
  { niche: "cars", query: "supercar garage" },
  { niche: "cars", query: "motorcycle road" },
  { niche: "cars", query: "car headlights dark" },
  { niche: "cars", query: "vintage car road trip" },
  { niche: "cars", query: "car dashboard sunset" },
  { niche: "cars", query: "off road jeep mountain" },
  { niche: "cars", query: "luxury car rain" },
  { niche: "cars", query: "car on coastal road" },
  { niche: "cars", query: "matte black car" },
];

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

let sharpMod;
let sharpTried = false;
async function getSharp() {
  if (sharpTried) return sharpMod;
  sharpTried = true;
  try {
    sharpMod = (await import("sharp")).default;
    sharpMod.concurrency(1);
    sharpMod.cache(false);
  } catch {
    sharpMod = null;
  }
  return sharpMod;
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: {}, hashes: [] };
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return { done: {}, hashes: [] };
  }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p));
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
  const sharp = await getSharp();
  if (!sharp) return bytes;
  try {
    const out = await sharp(Buffer.from(bytes), { failOn: "none" })
      .resize({ width: 1080, height: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return bytes;
  }
}

async function fetchAndUpload(url, niche, querySlug, seen) {
  let res;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch {
    return "error";
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) return "error";

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_SOURCE_BYTES) return "skip";

  let bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < MIN_SOURCE_BYTES || bytes.byteLength > MAX_SOURCE_BYTES) return "skip";

  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  if (seen.has(hash)) return "dupe";
  seen.add(hash);

  bytes = await maybeReencode(bytes);
  const key = `library/${niche}/${querySlug}/${hash}.jpg`;

  if (DRY_RUN) {
    console.log(`    would upload ${key} (${(bytes.byteLength / 1024).toFixed(0)}kb)`);
    return "ok";
  }

  try {
    await r2.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: "image/jpeg" }),
    );
  } catch {
    seen.delete(hash);
    return "error";
  }
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

  console.log(`${QUERIES.length} queries | target ${MAX_TOTAL} unique | starting at ${seen.size}`);

  for (const { niche, query } of QUERIES) {
    if (seen.size >= MAX_TOTAL) {
      console.log(`\nReached MAX_TOTAL (${MAX_TOTAL}). Stopping.`);
      break;
    }

    const querySlug = slug(query);
    const doneKey = `${niche}/${querySlug}`;
    if (progress.done[doneKey] !== undefined) {
      console.log(`= skip (done): ${doneKey}`);
      continue;
    }

    console.log(`\n> ${niche} / "${query}"  [total ${seen.size}]`);
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
