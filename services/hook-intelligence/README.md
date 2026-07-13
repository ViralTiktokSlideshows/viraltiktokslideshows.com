# Hook Intelligence Service

Internal-only backend (separate deploy from the main product) that turns
scraped TikTok slideshow data into pattern data for the generator, the
Reddit content workflow, and the Astro blog.

**Current status: documentation only.** Per the handover, nothing here is
implemented yet — no Bun/Hono server, no TikHub scraping, no pg-boss jobs,
no Postgres tables. What exists right now:

- `HANDOVER.md` — the full build spec (data flow, schema, jobs, ops notes).
- `openapi.yaml` — OpenAPI 3.1 contract for the 5 internal routes described
  in the handover's section 6, so downstream consumers (main product,
  Reddit workflow, Astro blog build) can build against a stable shape
  ahead of implementation.
- `docs.html` — a static Swagger UI page that renders `openapi.yaml`.

## Viewing the docs

Browsers block `fetch()` of local files opened directly via `file://`, so
`docs.html` needs to be served, not double-clicked. From this folder:

```
npx serve .
```

or

```
python3 -m http.server 4100
```

then open `http://localhost:4100/docs.html`.

## Auth (as documented)

Every route requires an `x-internal-key` header. There's no per-caller
auth yet — a single static shared secret for all callers:

```
x-internal-key: exyro45610y2627291
```

This is a placeholder value for the pre-implementation phase — swap it for
a real generated secret (and put it in `INTERNAL_API_SECRET`, not source
control) before this service is actually built and deployed.

## What's next (not done here)

Everything in `HANDOVER.md` sections 2–5 and 7–8: the Bun/Hono server
itself, the `scraped_posts` / `scrape_cursors` / `reddit_digest_cache`
tables, the TikHub scrape job, the Gemini enrichment job, the digest job,
and pg-boss wiring/scheduling. This README will get updated once that
work starts.
