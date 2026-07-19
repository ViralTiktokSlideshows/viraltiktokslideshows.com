# pinterest-r2

Standalone tool: bulk-fetch Pinterest images straight into Cloudflare R2.
Runs anywhere with Node 20+ and Python 3.10+. Nothing touches disk; images
stream Pinterest -> memory -> R2.

## VPS setup (SSH in first)

```bash
# 1. Confirm versions
node -v            # need v20+
python3 --version  # need 3.10+

# 2. Install pinterest-dl in a venv (cleanest on Debian/Ubuntu)
python3 -m venv ~/pdl
source ~/pdl/bin/activate
pip install "pinterest-dl[image]"
pinterest-dl --help    # confirm it's on PATH

# 3. Get this folder onto the VPS (pick one):
#    a) scp from your machine:
#       scp -r tools/pinterest-r2 user@your-vps:~/pinterest-r2
#    b) or just create the two files (fetch.mjs, package.json) with nano

cd ~/pinterest-r2

# 4. Install the one JS dependency
npm install

# 5. Add your R2 credentials
cp .env.example .env
nano .env          # fill in the five R2_ values

# 6. DRY RUN first (scrapes + logs, uploads nothing)
DRY_RUN=1 node --env-file=.env fetch.mjs

# 7. Real run (keep the venv activated so pinterest-dl stays on PATH)
node --env-file=.env fetch.mjs
```

## Notes

- Images land at `library/{niche}/{querySlug}/{hash}.jpg` in your bucket.
- Safe to re-run: `.pinterest-progress.json` tracks done queries + image
  hashes, so it resumes and dedupes.
- Edit the `QUERIES` array in `fetch.mjs` to change/expand what gets pulled.
  23 queries x 100 = ~2,300 images; add more queries to reach 10k.
- Tuning: `PER_QUERY`, `CONCURRENCY`, `QUERY_DELAY_MS` env vars.
- `sharp` is optional. If it fails to install on the VPS, the script still
  works — it just uploads full-resolution originals instead of resizing.
```
