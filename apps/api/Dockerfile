# TrustAI API (NestJS + in-process pg-boss worker).
# Build context MUST be the repo root (monorepo: needs the lockfile,
# pnpm-workspace.yaml and the @trustai/dtr-core workspace package).
#   docker build -f apps/api/Dockerfile -t trustai-api .
#
# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# corepack pins pnpm to the version in the root package.json "packageManager".
RUN corepack enable
WORKDIR /app

# ---- Build stage: install, generate Prisma client, compile dtr-core + api ----
FROM base AS build
# argon2 is a native addon → needs a toolchain; openssl is needed by Prisma.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ openssl \
 && rm -rf /var/lib/apt/lists/*
# Whole monorepo: a workspace install needs every package manifest + the lockfile.
COPY . .
RUN pnpm install --frozen-lockfile
# dtr-core must be built first (api resolves it via its dist/); api build also
# runs `prisma generate` (see apps/api package.json "build").
RUN pnpm --filter @trustai/dtr-core build \
 && pnpm --filter @trustai/api build

# ---- Runtime stage: carry the built workspace as-is (keeps the generated
# Prisma client exactly where pnpm placed it — avoids pnpm-deploy sharp edges) --
FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
# Railway injects PORT; main.ts reads process.env.PORT (defaults to 3000).
CMD ["node", "dist/main.js"]
