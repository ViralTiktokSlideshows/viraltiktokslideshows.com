# Build from the monorepo root: docker build -f apps/web/Dockerfile .
#
# Adapted from CMLP/apps/web/Dockerfile and vva/apps/web/Dockerfile — same stack and monorepo
# shape (pnpm workspaces with the `catalog:` protocol, Next.js web app depending only on
# packages/env + packages/ui + packages/config, no database dependency). Both of those repos
# had already deployed this exact pattern and hit real errors along the way; this file carries
# those fixes forward even where the reasoning isn't obvious from this codebase alone.
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests + lockfile first for layer caching.
# packages/db is intentionally excluded — the web app has no database dependency (it only
# depends on @viraltiktokslideshows/env, @viraltiktokslideshows/ui, and
# @viraltiktokslideshows/config — see apps/web/package.json).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# Both NEXT_PUBLIC_* vars (packages/env/src/web.ts) are read at the top of next.config.ts and
# get baked into the client bundle at build time — neither is read at container runtime, and
# both are required (env-nextjs throws if either is missing), so `next build` fails without them.
# Override via: --build-arg NEXT_PUBLIC_SERVER_URL=https://your-api.example.com
#               --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

RUN pnpm --filter web build

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# next.config.ts doesn't set `output: "standalone"`, so `next start` needs the full
# node_modules tree rather than a pruned bundle — copied wholesale from the builder instead of
# reinstalled here.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["pnpm", "start"]
