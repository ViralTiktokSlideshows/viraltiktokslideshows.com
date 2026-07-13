# Hook Intelligence Service — Developer Handover

**What this is:** An internal-only backend that scrapes TikTok (via TikHub) to build a database of what makes slideshows perform well. It is not user-facing. Three things consume its data: the main product's slideshow generator (better AI hooks), the Reddit content workflow (real stats to write about), and the blog (Astro, content pulled from the same dataset).

This service is intentionally separate from the main product backend — different deploy, different lifecycle, callable only internally.

> **Status: not implemented yet.** Only `openapi.yaml` (and this handover doc) exist so far — see `README.md` in this folder for what that covers and what's still open.

---

## 1. Purpose and data flow

```
TikHub (external API)
        |
        v
  [scrape job]  ---> scraped_posts table (raw, unenriched)
        |
        v
  [enrich job]  ---> Gemini 3.5 Flash (multimodal)
        |               - OCRs hook text off the image
        v               - classifies hook structure
  scraped_posts table (enriched)   - describes the background image
        |
        +---> /internal/hooks   ---> main product's generation prompt (few-shot examples)
        +---> /internal/images  ---> background image search-query builder (feeds Pexels/Unsplash)
        +---> /internal/reddit/digest ---> Reddit post drafts
        +---> /internal/hooks (higher limit) ---> Astro blog build (content collections)
```

Nothing scraped is ever served directly to end users — no raw TikTok images, no verbatim copied content. What gets reused downstream is *pattern data*: hook text (for prompting, not display), structure classification, and text descriptions of what an image looks like.

---

## 2. Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** PostgreSQL
- **Job queue:** pg-boss (same pattern as the notification system built for Sellspace — reuse that config if convenient)
- **External APIs:** TikHub (scraping), Gemini 3.5 Flash (OCR + classification + image description, multimodal)

---

## 3. Data model

### `scraped_posts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | |
| `platform_post_id` | VARCHAR, **UNIQUE NOT NULL** | TikTok's own post ID — this is the dedup key |
| `niche` | VARCHAR NOT NULL | e.g. `fitness`, `finance`, `storytime` |
| `source_hashtag` | VARCHAR NOT NULL | the hashtag/query used to find this post |
| `hook_text` | TEXT, nullable | filled in during enrichment |
| `structure_tag` | VARCHAR, nullable | one of: `question`, `bold_claim`, `nobody_tells_you`, `number_promise`, `other` — filled during enrichment |
| `likes_count` | INT | |
| `shares_count` | INT | |
| `comments_count` | INT | |
| `engagement_score` | NUMERIC | computed composite, used for ranking within a niche |
| `image_urls` | TEXT[] | slide image URLs as returned by TikHub |
| `image_descriptions` | TEXT[], nullable | Gemini-generated description per slide, filled during enrichment |
| `enrichment_status` | VARCHAR, default `pending` | `pending` \| `done` \| `failed` |
| `posted_at` | TIMESTAMPTZ, nullable | original TikTok post date, if TikHub provides it |
| `scraped_at` | TIMESTAMPTZ, default `now()` | |

### `scrape_cursors`

| Column | Type | Notes |
|---|---|---|
| `niche` | VARCHAR | part of composite PK |
| `hashtag` | VARCHAR | part of composite PK |
| `last_scraped_post_id` | VARCHAR | newest post ID actually **inserted** in the last run |
| `last_scraped_at` | TIMESTAMPTZ | |
| `last_max_engagement_seen` | INT | for monitoring — flags if a niche's top posts stop changing, which may mean the hashtag needs refreshing |

### `reddit_digest_cache`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | |
| `niche` | VARCHAR | |
| `week_of` | DATE | |
| `stats_json` | JSONB | aggregated numbers + top hooks for that niche/week |
| `generated_at` | TIMESTAMPTZ | |

---

## 4. Dedup logic (the part to get right)

TikHub's search/hashtag endpoints are engagement- or recency-sorted, and most don't reliably support "only give me posts since date X." So dedup happens at two layers, in this order:

1. **Cursor check (cheap, first pass).** Before calling TikHub, load the `scrape_cursors` row for this niche/hashtag. If the endpoint supports any recency filtering, use `last_scraped_at` to narrow the request.
2. **Insert-time dedup (guaranteed, second pass).** Every post returned gets inserted with `INSERT ... ON CONFLICT (platform_post_id) DO NOTHING`. This is the real guarantee — cheap filtering above is an optimization, this is the correctness backstop.
3. **Early-stop counter.** During a paginated run, track a consecutive-already-seen counter in memory. Increment it whenever an insert affects 0 rows (post already existed); reset it to 0 whenever an insert actually adds a new row. Once the counter hits a threshold (suggest 20), stop paginating that niche — you've caught up to last run's results, and continuing just burns TikHub credits for no new data.
4. **Cursor update.** After the run, update `scrape_cursors` with the newest `platform_post_id` that was **actually inserted** (not just seen) and the max engagement score observed, for monitoring.

---

## 5. Jobs (pg-boss queues)

**`scrape:niche`**
Input: `{ niche, hashtag }`. Runs the dedup flow above against TikHub, upserts new rows, updates the cursor. On completion, pushes the IDs of newly-inserted posts to `enrich:batch`.

**`enrich:batch`**
Input: batch of post IDs (suggest batching ~5-10 posts per Gemini call to balance request overhead against prompt quality — don't send an entire run's worth in one call). For each post: send its image(s) to Gemini 3.5 Flash with a prompt asking for (a) the hook text visible on slide 1, (b) a structure classification from the fixed tag list, (c) a short description of the background image. Parse the response, update the row, set `enrichment_status = done`. On parse failure, mark `failed` and let pg-boss's retry/backoff handle it — don't hand-roll retry logic.

**`digest:generate`**
Input: `{ niche, week_of }`. Aggregates that niche's enriched posts for the week into `reddit_digest_cache` — top hooks, engagement stats, structure-tag breakdown. This is what `/internal/reddit/digest` reads from, so the expensive aggregation happens once, not on every API call.

**Scheduling:** `scrape:niche` fans out weekly via pg-boss's built-in cron scheduling, one job per configured niche/hashtag pair. Keep the niche/hashtag list in an env var or a small config table — not hardcoded in job logic — so adding a niche doesn't require a code change.

---

## 6. Internal API (Hono)

All routes sit behind a single middleware check: request must include header `x-internal-key` matching `INTERNAL_API_SECRET`. Anything without it gets a 401. This service is never exposed on a public-facing route — it's called server-to-server only, from the main product backend, the Reddit content workflow, and the Astro blog build step.

See `openapi.yaml` in this folder for the full documented contract.

- `POST /internal/scrape/trigger`
- `GET /internal/scrape/status?niche=`
- `GET /internal/hooks?niche=&limit=&structure_tag=`
- `GET /internal/images?niche=&limit=`
- `POST /internal/reddit/digest`

---

## 7. Environment variables

```
DATABASE_URL=
TIKHUB_API_KEY=
GEMINI_API_KEY=
INTERNAL_API_SECRET=
NICHE_CONFIG=            # JSON array of {niche, hashtag} pairs, or point this at a config table instead
```

---

## 8. Operational notes

- **TikHub credits:** initial backfill across 10-15 niches runs roughly 500 requests. Budget $20-30 in credits to start; monitor balance and top up before it hits zero, since a failed scrape run due to an empty balance will silently produce no new data rather than erroring loudly — worth adding a low-balance check that logs a warning.
- **Watch `/internal/scrape/status` for niches returning zero new posts** two runs in a row — usually means the hashtag has gone stale and needs adjusting, not that the niche is exhausted.
- **Enrichment failures** are expected occasionally (OCR misses, malformed model output). pg-boss retry handles transient failures; posts stuck in `failed` after retries exhaust are fine to leave — they just won't contribute hooks, no need for manual intervention unless the failure rate spikes.
- **This service has no user-facing uptime requirement.** If it's down for a day, the main product just serves slightly staler hook examples — it's not on the critical path for slideshow generation, only enhances it. Don't over-engineer for high availability here.
