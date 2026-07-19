import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { env } from "@viraltiktokslideshows/env/server";

// The R2 image library — the ONLY source of slide background images now that
// Ideogram (paid AI) and Pexels (stock API) have both been removed. Images are
// pre-fetched into R2 under keys shaped like:
//   library/{niche}/{concept-slug}/{hash}.jpg
// (see tools/pinterest-r2). This module reads that structure back out: it
// builds a cached taxonomy of what's actually in the bucket right now, hands
// that vocabulary to the text model so it only ever asks for concepts that
// exist, and resolves a slide's chosen concept to a real image URL with layered
// fallbacks so a slide practically never ends up imageless while the library
// has anything in it at all.
//
// Nothing here costs money per call — it's ListObjectsV2 against our own bucket
// plus the public R2 URL. Results are cached so a burst of generations doesn't
// hammer R2 with list calls.

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = env.R2_BUCKET_NAME;
const PUBLIC_URL = env.R2_PUBLIC_URL.replace(/\/$/, "");
const PREFIX = "library/";
const TAXONOMY_TTL_MS = 10 * 60 * 1000;
const FOLDER_TTL_MS = 10 * 60 * 1000;
const GLOBAL_POOL_CAP = 3000;

type Folder = { niche: string; concept: string; slug: string; tokens: string[] };

let taxonomy: Folder[] = [];
let taxonomyAt = 0;
let taxonomyPromise: Promise<void> | null = null;

const folderKeyCache = new Map<string, { keys: string[]; at: number }>();
let globalPool: string[] = [];
let globalPoolAt = 0;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function slugify(s: string): string {
  return tokenize(s).join("-");
}

// All CommonPrefixes exactly one level below `prefix` (delimiter-based listing),
// paginated. Used to walk library/ -> niches, then library/{niche}/ -> concepts.
async function listPrefixes(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: token,
      }),
    );
    for (const cp of res.CommonPrefixes ?? []) {
      if (cp.Prefix) out.push(cp.Prefix);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function refreshTaxonomy(): Promise<void> {
  const nichePrefixes = await listPrefixes(PREFIX);
  const folders: Folder[] = [];
  for (const np of nichePrefixes) {
    const niche = np.slice(PREFIX.length).replace(/\/$/, "");
    if (!niche) continue;
    const conceptPrefixes = await listPrefixes(np);
    for (const cp of conceptPrefixes) {
      const concept = cp.slice(np.length).replace(/\/$/, "");
      if (!concept) continue;
      folders.push({
        niche,
        concept,
        slug: concept,
        tokens: tokenize(`${niche} ${concept.replace(/-/g, " ")}`),
      });
    }
  }
  taxonomy = folders;
  taxonomyAt = Date.now();
  console.log(`[library] taxonomy refreshed: ${folders.length} concept folders across bucket`);
}

async function ensureTaxonomy(): Promise<void> {
  const fresh = taxonomy.length > 0 && Date.now() - taxonomyAt < TAXONOMY_TTL_MS;
  if (fresh) return;
  if (!taxonomyPromise) {
    taxonomyPromise = refreshTaxonomy()
      .catch((err) => {
        console.error("[library] taxonomy refresh failed", err);
      })
      .finally(() => {
        taxonomyPromise = null;
      });
  }
  await taxonomyPromise;
}

async function listFolderKeys(prefix: string): Promise<string[]> {
  const cached = folderKeyCache.get(prefix);
  if (cached && Date.now() - cached.at < FOLDER_TTL_MS) return cached.keys;

  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && keys.length < 1000);

  folderKeyCache.set(prefix, { keys, at: Date.now() });
  return keys;
}

async function ensureGlobalPool(): Promise<void> {
  if (globalPool.length > 0 && Date.now() - globalPoolAt < FOLDER_TTL_MS) return;
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && keys.length < GLOBAL_POOL_CAP);
  globalPool = keys;
  globalPoolAt = Date.now();
}

function randomOf<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Best real folder for a free-text concept phrase. Exact slug match wins (the
// model is told to copy an available concept verbatim), otherwise the folder
// with the most overlapping words, otherwise a random folder so we still return
// something real rather than nothing.
function pickFolder(visual: string): Folder | null {
  if (taxonomy.length === 0) return null;

  const slug = slugify(visual);
  if (slug) {
    const exact = taxonomy.find((f) => f.slug === slug);
    if (exact) return exact;
  }

  const qTokens = tokenize(visual);
  if (qTokens.length === 0) return randomOf(taxonomy) ?? null;

  let best: Folder | null = null;
  let bestScore = 0;
  for (const folder of taxonomy) {
    let score = 0;
    for (const t of qTokens) if (folder.tokens.includes(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = folder;
    }
  }
  if (best && bestScore > 0) return best;
  return randomOf(taxonomy) ?? null;
}

// A public R2 URL for an image matching `visual`, or null only if the library
// is completely empty. Fallback ladder: chosen concept folder -> other concepts
// in the same niche -> any image in the whole library.
export async function pickImageUrl(visual?: string): Promise<string | null> {
  await ensureTaxonomy();
  if (taxonomy.length === 0) return null;

  const tried = new Set<string>();
  let folder = pickFolder(visual ?? "");

  for (let attempt = 0; attempt < 3 && folder; attempt += 1) {
    const prefix = `${PREFIX}${folder.niche}/${folder.slug}/`;
    if (!tried.has(prefix)) {
      tried.add(prefix);
      const keys = await listFolderKeys(prefix).catch(() => [] as string[]);
      const key = randomOf(keys);
      if (key) return `${PUBLIC_URL}/${key}`;
    }
    const sameNiche = taxonomy.filter(
      (f) => f.niche === folder!.niche && !tried.has(`${PREFIX}${f.niche}/${f.slug}/`),
    );
    folder = randomOf(sameNiche) ?? null;
  }

  await ensureGlobalPool().catch(() => {});
  const key = randomOf(globalPool);
  return key ? `${PUBLIC_URL}/${key}` : null;
}

// Batch version — resolves every slide's image in parallel. Slides that come
// back null (only possible when the library is empty) are just omitted, exactly
// like the old stock/AI path, so a caller merges in whatever it got.
export async function pickLibraryImages(
  slides: { index: number; visual?: string }[],
): Promise<Map<number, string>> {
  await ensureTaxonomy();
  const out = new Map<number, string>();
  const results = await Promise.all(
    slides.map(async (slide) => ({
      index: slide.index,
      url: await pickImageUrl(slide.visual).catch(() => null),
    })),
  );
  for (const r of results) if (r.url) out.set(r.index, r.url);
  return out;
}

// Compact, model-facing inventory of what's actually in the bucket right now:
// each niche with a sample of its available concepts. Injected into the system
// prompt so the model only ever asks for concepts that exist. Empty string when
// the library has nothing yet (the prompt then just omits the section).
export async function getConceptVocabulary(maxPerNiche = 18): Promise<string> {
  await ensureTaxonomy();
  if (taxonomy.length === 0) return "";

  const byNiche = new Map<string, string[]>();
  for (const folder of taxonomy) {
    const arr = byNiche.get(folder.niche) ?? [];
    if (arr.length < maxPerNiche) arr.push(folder.concept.replace(/-/g, " "));
    byNiche.set(folder.niche, arr);
  }

  const lines: string[] = [];
  for (const [niche, concepts] of byNiche) {
    lines.push(`- ${niche}: ${concepts.join(", ")}`);
  }
  return lines.join("\n");
}

export async function hasLibrary(): Promise<boolean> {
  await ensureTaxonomy();
  return taxonomy.length > 0;
}
