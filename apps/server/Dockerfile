# Build from the monorepo root: docker build -f apps/server/Dockerfile .
#
# Adapted from CMLP/apps/server/Dockerfile, itself adapted from two already-deployed sibling
# projects (vva, stayzim) that share this exact stack (pnpm workspaces + `catalog:` protocol,
# Bun runtime, Hono, Prisma 7). Specifically:
#   - pnpm-via-standalone-installer + allowBuilds handling: from vva/apps/server/Dockerfile
#     (this repo's pnpm-workspace.yaml also uses `catalog:` for shared deps, which `bun
#     install` cannot resolve — pnpm is required for the install step even though Bun is
#     the runtime).
#   - the build step + `dist/index.mjs` runtime entrypoint: from stayzim/apps/server/Dockerfile
#     (this app's package.json has a real "build": "tsdown" script and a
#     "start": "bun run dist/index.mjs" script — so we DO build to dist/ and run that instead
#     of running src/index.ts directly).
FROM oven/bun:1

WORKDIR /app

# openssl/ca-certificates: Prisma's query engine + TLS to a managed Postgres (Neon/Supabase/
# RDS with sslmode=require, etc.). curl: fetches the pnpm standalone installer below.
# libatomic1: the pnpm standalone installer is a compiled glibc build that dynamically links
# libatomic, which isn't installed by default on this image ("libatomic.so.1: cannot open
# shared object file" otherwise).
# fonts-liberation + fontconfig: the server bakes slide text onto downloaded images with
# @napi-rs/canvas (see src/lib/compose-slide.ts), which needs a real font file on disk to draw
# with -- this image ships none by default, so the text would render blank. Liberation Sans is
# Arial-metric (closest to the app's Inter); compose-slide.ts registers it by path.
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates curl libatomic1 fontconfig fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Bun is the runtime, but installs go through pnpm. pnpm-workspace.yaml uses the `catalog:`
# protocol for shared dependency versions (zod, typescript, dotenv, ...), which `bun install`
# doesn't resolve the same way pnpm's workspace linker does.
#
# `bun install -g pnpm` runs pnpm's CLI under Bun's own JS engine, and pnpm 11's lockfile/
# store code imports `node:sqlite`, a Node built-in this Bun version doesn't implement yet
# ("error: No such built-in module: node:sqlite"). pnpm's standalone installer ships its own
# self-contained Node runtime, sidestepping Bun entirely for this one step.
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
# The installer's post-install step runs `pnpm setup`, which tries to detect the calling
# shell to patch its profile file — `docker build`'s /bin/sh -c has no $SHELL set, so it fails
# with ERR_PNPM_UNKNOWN_SHELL. PNPM_HOME/PATH are already set above; the shell just needs to
# exist, not be "right".
ENV SHELL=/bin/bash
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=11.4.0 sh - \
  && pnpm --version

# Some platforms (Coolify and similar) inject NODE_ENV=production as a build-time variable;
# pnpm treats that the same as `--prod` and silently skips devDependencies — which would drop
# tsdown, typescript, and prisma, all needed below. Force it back until the runtime ENV near
# the bottom.
ENV NODE_ENV=development

# Manifests + lockfile first, for layer caching. apps/server needs @viraltiktokslideshows/env
# (runtime), @viraltiktokslideshows/config (tsconfig base), and @viraltiktokslideshows/db
# (Prisma client + schema) from packages/ — the web app is left out of this image on purpose.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/db/package.json packages/db/
COPY apps/server/package.json apps/server/

# packages/db/package.json has "postinstall": "prisma generate", which pnpm runs
# automatically as part of `pnpm install` below — before the "source after install" copy
# further down would otherwise land the schema. Without the schema present at install time,
# that postinstall fails with "Could not find Prisma Schema" and takes the whole install down
# with it. Bring just the schema + prisma.config.ts in now (cheap, and these change far less
# often than application code, so this barely dents layer-cache reuse).
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/ packages/db/prisma/

# prisma.config.ts reads DATABASE_URL through prisma/config's `env()` helper, which throws if
# the variable is missing entirely — so even `prisma generate`, which never touches a real
# database, fails at build time without *something* set here. Pass the real value at container
# start (along with any other secrets, which have no build-time dependency and are only
# validated/used at startup) — this build-time default is a dummy.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# allowBuilds in pnpm-workspace.yaml already approves the postinstall/build scripts this repo
# needs (esbuild, sharp, prisma, @prisma/engines) — no extra flags needed for pnpm to run them.
RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY apps/server/ apps/server/

RUN pnpm --filter @viraltiktokslideshows/db db:generate
RUN pnpm --filter server build

ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGIN=http://localhost:3001
EXPOSE 3000

WORKDIR /app/apps/server

# `prisma migrate deploy` (not the package.json "db:migrate" script, which is
# "prisma migrate dev" — interactive and dev-only, unsuitable here) applies any migrations in
# packages/db/prisma/migrations/ that haven't been recorded as applied yet, before the server
# starts taking traffic. This repo has no migrations yet (schema-only so far, no
# `prisma migrate dev` has been run against a real database) — this is a no-op today and
# starts working the moment migrations exist, with nothing to change here later.
#
# This runs at container *startup*, not build time, on purpose: it needs the real DATABASE_URL
# (your platform injects it at runtime, not the "build:build@localhost" placeholder ARG'd in
# above) and needs to be on the same network as the database, which only the running container
# is guaranteed to be.
#
# `exec` replaces the shell with the bun process so it keeps receiving signals (e.g. SIGTERM)
# directly for a clean shutdown, instead of going to the shell.
CMD ["sh", "-c", "cd /app/packages/db && pnpm exec prisma migrate deploy && cd /app/apps/server && exec bun run dist/index.mjs"]
